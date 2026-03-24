document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  const missingArtImages = Array.from(
    document.querySelectorAll('.song-item.is-missing-art img[data-spotify-url]')
  );

  if (!missingArtImages.length) {
    return;
  }

  const cache = new Map();
  const queue = [...missingArtImages];
  const workers = Array.from({ length: Math.min(4, queue.length) }, () => loadNextImage());

  Promise.allSettled(workers);

  async function loadNextImage() {
    while (queue.length) {
      const img = queue.shift();

      if (!img) {
        return;
      }

      const songCard = img.closest('.song-item');
      const spotifyUrl = img.dataset.spotifyUrl;

      if (!songCard || !spotifyUrl) {
        continue;
      }

      try {
        const imageUrl = await getSpotifyThumbnail(spotifyUrl);

        if (!imageUrl) {
          continue;
        }

        img.src = imageUrl;
        songCard.classList.remove('is-missing-art');
        songCard.classList.add('has-art');
      } catch (error) {
        // Keep the text overlay and placeholder background when Spotify blocks a lookup.
      }
    }
  }

  async function getSpotifyThumbnail(spotifyUrl) {
    if (cache.has(spotifyUrl)) {
      return cache.get(spotifyUrl);
    }

    const response = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`
    );

    if (!response.ok) {
      throw new Error(`Spotify oEmbed failed with ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.thumbnail_url || '';
    cache.set(spotifyUrl, imageUrl);
    return imageUrl;
  }
});
