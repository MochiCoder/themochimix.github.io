
document.addEventListener('DOMContentLoaded', (event) => {
    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Fade-in effect for content
    const content = document.querySelector('.container');
    content.style.opacity = 0;
    let opacity = 0;
    let intervalID = setInterval(function() {
        if (opacity < 1) {
            opacity = opacity + 0.1;
            content.style.opacity = opacity;
        } else {
            clearInterval(intervalID);
        }
    }, 100);

    // Past Albums of the Week
    const albumHistory = [
        {date: "6/8", artist: "Pinkpantheress", album: "Fancy That"},
        {date: "6/1", artist: "Aminé", album: "13 Months of Sunshine"}
    ];

    // Create album history section
    const albumSection = document.createElement('div');
    albumSection.className = 'album-history';

    const albumTitle = document.createElement('h3');
    albumTitle.textContent = 'Past Albums of the Week';
    albumSection.appendChild(albumTitle);

    const albumList = document.createElement('ul');
    albumList.style.listStyle = 'none';

    albumHistory.forEach(entry => {
        const listItem = document.createElement('li');
        listItem.textContent = `${entry.date} - ${entry.artist}: ${entry.album}`;
        albumList.appendChild(listItem);
    });

    albumSection.appendChild(albumList);
    document.querySelector('.container').appendChild(albumSection);
});
