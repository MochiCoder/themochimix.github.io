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

  const storageKey = 'spotify-oembed-thumbnails-v1';
  const cache = loadCache();
  const queue = [];
  const queuedUrls = new Set();
  let processingQueue = false;
  let rateLimitedUntil = 0;

  hydrateFromCache();

  const observer = new IntersectionObserver(handleIntersect, {
    rootMargin: '500px 0px',
    threshold: 0.01
  });

  missingArtImages.forEach(img => observer.observe(img));

  function handleIntersect(entries) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        return;
      }

      const img = entry.target;
      const spotifyUrl = img.dataset.spotifyUrl;

      observer.unobserve(img);

      if (!spotifyUrl || queuedUrls.has(spotifyUrl) || cache.has(spotifyUrl)) {
        return;
      }

      queue.push(img);
      queuedUrls.add(spotifyUrl);
      processQueue();
    });
  }

  async function processQueue() {
    if (processingQueue) {
      return;
    }

    processingQueue = true;

    while (queue.length) {
      const waitTime = rateLimitedUntil - Date.now();

      if (waitTime > 0) {
        await delay(waitTime);
      }

      const img = queue.shift();

      if (!img) {
        continue;
      }

      const songCard = img.closest('.song-item');
      const spotifyUrl = img.dataset.spotifyUrl;

      if (!songCard || !spotifyUrl) {
        continue;
      }

      try {
        const imageUrl = await getSpotifyThumbnail(spotifyUrl);

        if (imageUrl) {
          applyImage(img, songCard, imageUrl);
        } else {
          markFailed(songCard);
        }
      } catch (error) {
        if (error && error.rateLimited) {
          rateLimitedUntil = Date.now() + 60 * 1000;
          markRateLimited(songCard);
          queue.length = 0;
          break;
        }

        markFailed(songCard);
      }

      await delay(350);
    }

    processingQueue = false;
  }

  async function getSpotifyThumbnail(spotifyUrl) {
    if (cache.has(spotifyUrl)) {
      return cache.get(spotifyUrl);
    }

    const response = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`
    );

    if (!response.ok) {
      const error = new Error(`Spotify oEmbed failed with ${response.status}`);
      error.rateLimited = response.status === 429;
      throw error;
    }

    const data = await response.json();
    const imageUrl = data.thumbnail_url || '';
    cache.set(spotifyUrl, imageUrl);
    persistCache();
    return imageUrl;
  }

  function hydrateFromCache() {
    missingArtImages.forEach(img => {
      const spotifyUrl = img.dataset.spotifyUrl;
      const songCard = img.closest('.song-item');

      if (!spotifyUrl || !songCard || !cache.has(spotifyUrl)) {
        return;
      }

      const cachedImage = cache.get(spotifyUrl);

      if (cachedImage) {
        applyImage(img, songCard, cachedImage);
      }
    });
  }

  function applyImage(img, songCard, imageUrl) {
    img.src = imageUrl;
    songCard.classList.remove('is-missing-art', 'art-fetch-failed', 'art-rate-limited');
    songCard.classList.add('has-art');
  }

  function markFailed(songCard) {
    songCard.classList.add('art-fetch-failed');
  }

  function markRateLimited(songCard) {
    songCard.classList.remove('art-fetch-failed');
    songCard.classList.add('art-rate-limited');
  }

  function loadCache() {
    try {
      const raw = window.localStorage.getItem(storageKey);

      if (!raw) {
        return new Map();
      }

      return new Map(Object.entries(JSON.parse(raw)));
    } catch (error) {
      return new Map();
    }
  }

  function persistCache() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(cache)));
    } catch (error) {
      // Ignore storage failures and keep runtime-only cache.
    }
  }

  function delay(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }
});
