
const wordsList = [
"AFM",
"Al Expert",
"AIDS Stack",
"Aldus FreeHand",
"Algorithmic Image",
"Algorithms",
"Alphapacer",
"Alpha Stim",
"Apple computers",
"Apple IIe",
"Macintosh",
"Amiga 500",
"Animation",
"Answering machines",
"Atari SE Virus",
"Audio-Forum",
"Audio recordings",
"AutoCAD",
"BASIC, programming in",
"BASIC: Getting Started",
"Basic Robotic Concepts",
"Beginner's BASIC",
"Bell Labs Virus",
"Bioelectricity",
"Biofeedback",
"Boston Computer Society",
"Brain,",
"Bulletin board systems",
"C Programming Language",
"CA (Cellular Automata)",
"Cable News Network",
"CAD (Computer Aided Design)",
"CAD/CAM Journal",
"CADENCE",
"Cameras",
"Camé6 Board",
"Canon Cat",
"Canon Fax 110",
"Cap Scan",
"Cartography",
"Cassettes",
"CB Simulator",
"CD-ROM",
"CD-ROM Review",
"Cell Systems",
"CENDATA",
"Chariot",
"Cinefex",
"Clip art",
"Clipping services",
"CNN News Hound",
"Codes",
"Comics Journal",
"Complex Systems",
"CompuServe",
"Computer graphics",
"Computer industry",
"Computer Lib/Dream Machines",
"Computer Mail Order",
"Computer Shopper",
"Computers",
"Consumer electronics",
"Contact Quarterly",
"Copy machines",
"Copyscreen",
"CP/M computers",
"CP/M Times",
"Cryptography",
"Cryptologia",
"Cybernetics",
"Cybernetic",
"Cyberpunk 101",
"Data Physician",
"Data protection",
"Database",
"Databases",
"Delphi",
"Deluxe Video",
"Design, CAD",
"Design, graphic",
"Diagrams",
"Disk Defender",
"DNA Music",
"DNA Suite",
"Dream Network Bulletin",
"Ear Magazine",
"Electronic mail",
"Electronics, consumer",
"Enabling computers",
"Facets Multimedia Center",
"Fax machines",
"FidoNet",
"Focal Point",
"Gateway",
"GBBS",
"Generic CADD",
"GEnie",
"Gocco Guide",
"Gocco Printer",
"Hackers",
"Hacking",
"Ham radio",
"HamNet SIG",
"Hello Direct",
"Hemi-Sync",
"Home Business",
"Home office",
"How to Buy Software",
"How to Copyright Software",
"How to Get Free Software",
"HyperAge",
"HyperCard",
"Hypertext",
"IBM clones",
"IBM programming",
"Image Pre-Mastering",
"Image processing",
"Imagewriter printer",
"Integrated software",
"Instant Litter",
"Instructional video",
"Islands in the Net",
"Israeli Virus",
"J&R Music World",
"Kantronics",
"Keyboards",
"MacCalligraphy",
"MacGuide",
"Macintosh HyperCard",
"Macintosh SE",
"Macintosh II",
"Maclin Virus",
"MacMag Virus",
"MacRecorder",
"Maclutor",
"MacWEEK",
"Machines",
"Mandelbrot Set",
"Martel Electronics",
"Megabrain",
"Memory",
"Memory Book",
"Microphones",
"Microsoft Word",
"MIDI",
"MIDI for Musicians",
"MinitelNet",
"Mobile radio",
"Monitoring Times",
"MS-DOS computers",
"Music, computer",
"Music, electronic",
"Music software",
"Music Technology",
"NASA Space Archives",
"New York On Line",
"Next Hurrah",
"Nonprofit Computer Exchange",
"Numerical Recipes",
"Online",
"Online databases",
"Open Stack",
"Optical Data Corporation",
"OS/2",
"Pagers",
"Paint software",
"PC-File Plus",
"PC Magazine",
"PC Pursuit",
"PC Week",
"PC-Write",
"PeaceNet",
"Radio",
"RAS Records",
"Reliable Corp.",
"Remote imaging",
"RE:SET",
"Robot Review",
"Robotics",
"Roland D-50",
"Rubberstamps",
"Sampling Book",
"Screenplay",
"Software,",
"Stackware",
"Teleconferencing",
"Television, video",
"Telephone",
"Tom Davis Books",
"Turbo Pascal",
"Video",
"Video by mail",
"Voice Mail",
"Word processors",
"Writer's software"
];

const images = Array.from({ length: 30 }, (_, i) => `images/${i + 1}.png`);

function getRandomImages(arr, count) {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

document.querySelectorAll('.icon').forEach(icon => {
  icon.addEventListener('click', () => {
    const selectedImages = getRandomImages(images, 5);
    selectedImages.forEach(src => createImageWindow(src));
  });
});

const trashIcon = document.querySelector('.icon[data-window="trash-window"]');

trashIcon.addEventListener('click', () => {
  // Select all windows and remove them
  document.querySelectorAll('.window').forEach(win => win.remove());
});

function createImageWindow(src) {
  const win = document.createElement('div');
  win.className = 'window';
  win.style.left = `${Math.random() * (window.innerWidth-250)}px`;
  win.style.top = `${50 + Math.random() * (window.innerHeight-300)}px`;
  win.style.display = 'block';

  // Create header with close box
  const header = document.createElement('div');
  header.className = 'window-header';

  const closeBox = document.createElement('div');
  closeBox.className = 'close-box';
  closeBox.onclick = () => closeWindow(closeBox);

  const titleSpan = document.createElement('span');
  titleSpan.textContent = wordsList[Math.floor(Math.random() * wordsList.length)];

  header.appendChild(closeBox);
  header.appendChild(titleSpan);

  // Body with image
  const body = document.createElement('div');
  body.className = 'window-body';
  const img = document.createElement('img');
  img.src = src;
  img.style.width = '100%';
  body.appendChild(img);

  win.appendChild(header);
  win.appendChild(body);
  document.querySelector('.desktop').appendChild(win);

  makeWindowDraggable(win, header);
}

function makeWindowDraggable(windowEl, headerEl) {
  let offsetX, offsetY, isDragging = false;

  headerEl.addEventListener('mousedown', e => {
    isDragging = true;
    const rect = windowEl.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    windowEl.style.zIndex = Date.now();
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    windowEl.style.left = `${e.clientX - offsetX}px`;
    windowEl.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener('mouseup', () => isDragging = false);
}

function closeWindow(el) {
  const windowEl = el.closest('.window');
  if (windowEl) {
    windowEl.remove(); // completely deletes the element
  }
}