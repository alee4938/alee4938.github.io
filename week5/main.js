const eye = document.querySelector('.eye');

// default (passive)
const passive = "https://i.postimg.cc/FzG3XHcx/ezgif-com-animated-gif-maker-1.gif";
const hover = "https://i.postimg.cc/y8pjSvJq/ezgif-com-animated-gif-maker.gif";
const hoverOut = "https://i.postimg.cc/jSdH49mW/ezgif-com-animated-gif-maker-2.gif";

const episodeTexts = [
`Episode 1 – Camera and Painting
Berger’s discussion of how reproductions alter the meaning of paintings made me rethink the idea of originality. Seeing a painting in a chapel versus on a TV screen changes not just its visual impact but its emotional and cultural significance. I was struck by how context shapes interpretation. Images are not fixed; their meaning is malleable. The idea that reproductions can act like words, conveying ideas across time and space, also made me consider how art and media influence our perceptions today, from social media to advertising. This episode made me aware that how we see something is as important as what we see.`,

`Episode 2 – Women and Art
Episode 2 challenged the distinction between being naked and being nude. I had not considered that in Western art, nudity often reflects the viewer’s gaze rather than the subject’s reality. Berger’s insight that to be naked is to be without clothes, while to be nude is to be an object highlighted how women have historically been depicted as objects of desire rather than autonomous individuals. It made me question the power dynamics embedded in art, who is looking, who is being looked at, and why. The episode also made me reflect on contemporary media, where the objectification Berger critiques is still widespread, showing how deeply these visual traditions persist.`,

`Episode 3 – Painting and Possessions
In Episode 3, I was surprised to learn how European oil paintings were closely tied to wealth, power, and cultural superiority. I had always thought of art as primarily aesthetic or expressive, but Berger emphasized the social function of these works. They celebrated ownership and reinforced social hierarchies. This perspective made me think about how art can be used to project identity and status, not just for the artist but for the owner. It also made me reflect on how our contemporary “collectible culture,” from luxury brands to NFT art, carries similar undertones of ownership and prestige.`,

`Episode 4 – Fine Arts and Commerce
Episode 4 made me realize that publicity and glamour are engineered to create desire and social comparison. Berger’s idea that glamour requires envy was eye-opening. Advertisements and media images are not just selling products; they are selling a lifestyle and a version of ourselves we aspire to. The contrast with oil paintings is striking. Paintings celebrated what someone had, while publicity appeals to what we wish we had. This reflection made me more critical of the media's influence, especially how it shapes our expectations and self-image, often by excluding ordinary experiences in favor of idealized visions. It revealed how publicity can subtly manipulate emotions and perceptions in ways we rarely notice.`
];

let activeEpisode = null;

const textBox = document.getElementById('episode-text');


const container = document.getElementById('small-eyes-container');
const numSmallEyes = 64; // adjust number for density
for (let i = 0; i < numSmallEyes; i++) {
  const smallEye = document.createElement('div');
  smallEye.classList.add('eye', 'small-eye');
  container.appendChild(smallEye);
}
const eyes = document.querySelectorAll('.eye');
document.querySelectorAll('.eye').forEach((eye, index) => {
  // Create preloaded images
    const imgPassive = document.createElement('img');
    const imgHover = document.createElement('img');
    const imgHoverOut = document.createElement('img');

    imgPassive.src = passive;
    imgHover.src = hover;
    imgHoverOut.src = hoverOut;

    imgPassive.classList.add('active'); // start passive

    eye.append(imgPassive, imgHover, imgHoverOut);

    // Helper to show a specific GIF and hide others
    function show(imgToShow) {
        [imgPassive, imgHover, imgHoverOut].forEach(img => {
        img.classList.toggle('active', img === imgToShow);
        // restart by appending a query param
        if (img === imgToShow) img.src = img.src.split('?')[0] + '?t=' + Date.now();
        });
    }

    eye.addEventListener('mouseenter', () => show(imgHover));
    eye.addEventListener('mouseleave', () => {
        show(imgHoverOut);
        setTimeout(() => show(imgPassive), 600); // adjust to hover-out duration
    });

    eye.addEventListener('click', () => {
        const episodeIndex = index % 4;
        if (activeEpisode === episodeIndex) {
            eyes.forEach((eye, i) => {
                if (i % 4 === episodeIndex) {
                    const imgs = eye.querySelectorAll('img');
                    imgs.forEach(img => img.classList.remove('active'));
                    imgs[2].classList.add('active'); // play close gif
                    imgs[2].src = imgs[2].src.split('?')[0] + '?t=' + Date.now();
                    setTimeout(() => {
                        imgs.forEach(img => img.classList.remove('active'));
                        imgs[0].classList.add('active'); // return to idle
                    }, 600);
                }
            });
            textBox.style.display = 'none';
            activeEpisode = null;
            return;
        }
        textBox.style.display = 'block';
        textBox.innerText = episodeTexts[index%4];
        activeEpisode = episodeIndex;
        eyes.forEach((otherEye, i) => {
            if (i % 4 === episodeIndex) {
                const imgs = otherEye.querySelectorAll('img');
                imgs.forEach(img => img.classList.remove('active'));
                imgs[1].classList.add('active'); // hover GIF is index 1
                imgs[1].src = imgs[1].src.split('?')[0] + '?t=' + Date.now(); // restart GIF
            }else{
                const imgs = otherEye.querySelectorAll('img');
                imgs.forEach(img => img.classList.remove('active'));
                imgs[2].classList.add('active'); // hover-out GIF
                imgs[2].src = imgs[2].src.split('?')[0] + '?t=' + Date.now(); // restart GIF

                // After hover-out GIF finishes, revert to passive
                setTimeout(() => {
                    imgs.forEach(img => img.classList.remove('active'));
                    imgs[0].classList.add('active'); // passive GIF
                }, 600); // adjust 600ms to match hover-out GIF duration
            }
        });
    });
});
