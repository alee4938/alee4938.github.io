const site_wide_cursor = document.querySelector('.custom-cursor.site-wide');
const insideText = document.querySelector('.bottom-text');
const hidden_area = document.querySelector('.hidden-area');

site_wide_cursor.style.display = 'none';
hidden_area.style.display = 'none';
insideText.style.webkitMaskPosition = `-1000px -1000px`;
insideText.style.maskPosition = `-1000px -1000px`;
let hasMoved = false;

document.addEventListener('mousemove', (evt) => {
    if (!hasMoved) {
        // Show spotlight on first movement
        site_wide_cursor.style.display = 'block';
        hidden_area.style.display = 'block';
        hasMoved = true;
    }
    TrackCursor(evt);
});


document.addEventListener('mouseenter', () => {
    site_wide_cursor.style.display = 'block';
    hidden_area.style.display = 'block';
});

document.addEventListener('mouseleave', () => {
    site_wide_cursor.style.display = 'none';
    hidden_area.style.display = 'none';
    insideText.style.webkitMaskPosition = `-1000px -1000px`;
    insideText.style.maskPosition = `-1000px -1000px`;
});

function TrackCursor(evt) {
    const w = site_wide_cursor.clientWidth;
    const h = site_wide_cursor.clientHeight;
    const mouseX = evt.clientX;
    const mouseY = evt.clientY;
    const rect = insideText.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const relativeX = mouseX - w / 2 - (rect.width/2.9);
    const relativeY = mouseY - h / 2 - (rect.width/8.7);
    site_wide_cursor.style.transform = `translate3d(${evt.clientX - w/2}px, ${evt.clientY - h/2}px, 0)`;
    insideText.style.webkitMaskPosition = `${relativeX}px ${relativeY}px`;
    insideText.style.maskPosition = `${relativeX}px ${relativeY}px`;
};