const site_wide_cursor = document.querySelector('.custom-cursor.site-wide');
const insideText = document.querySelector('.bottom-text');
const hidden_area = document.querySelector('.hidden-area');

document.addEventListener('mouseenter', () => {
    site_wide_cursor.style.display = 'block';
    hidden_area.style.display = 'block';
});

document.addEventListener('mouseleave', () => {
    site_wide_cursor.style.display = 'none';
    hidden_area.style.display = 'none';
});

document.addEventListener('mousemove', TrackCursor);

function TrackCursor(evt) {
    const w = site_wide_cursor.clientWidth;
    const h = site_wide_cursor.clientHeight;
    const mouseX = evt.clientX;
    const mouseY = evt.clientY;
    const rect = insideText.getBoundingClientRect();
    const relativeX = mouseX - w / 2 - 590;
    const relativeY = mouseY - h / 2 - (rect.height/2) + 250;
    site_wide_cursor.style.transform = `translate3d(${evt.clientX - w/2}px, ${evt.clientY - h/2}px, 0)`;
    insideText.style.webkitMaskPosition = `${relativeX}px ${relativeY}px`;
    insideText.style.maskPosition = `${relativeX}px ${relativeY}px`;
};