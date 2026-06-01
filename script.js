let isRunning = false;
let alarmPlaying = false;
let countdownInterval;
let timeLeft = 600; // 10 minuta u sekundama

// Audio varijable
let audioCtx = null;
let oscillator = null;

// Varijable za žiroskop
let lastX = null, lastY = null, lastZ = null;
const SENSITIVITY = 3; // Koliko stepeni nagiba aktivira alarm (manje = osetljivije)

const startBtn = document.getElementById('startBtn');
const timerDisplay = document.getElementById('timer');
const statusDisplay = document.getElementById('status');

startBtn.addEventListener('click', () => {
    if (!isRunning) {
        startApp();
    } else {
        stopApp();
    }
});

function startApp() {
    isRunning = true;
    startBtn.textContent = "ZAUSTAVI";
    statusDisplay.textContent = "Status: Spusti telefon!";
    statusDisplay.style.color = "#66fcf1";
    
    // 1. Pokretanje audio konteksta (mora na klik korisnika)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // 2. Traženje dozvole za senzore (bitno za iOS/novije Android uređaje)
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleMotion);
                } else {
                    alert('Morate dozvoliti pristup senzorima da bi aplikacija radila.');
                }
            })
            .catch(console.error);
    } else {
        // Stariji Androidi automatski daju dozvolu
        window.addEventListener('deviceorientation', handleMotion);
    }

    // 3. Pokretanje tajmera
    startTimer();
    
    // 4. Pokušaj zaključavanja ekrana da se ne ugasi (Wake Lock)
    requestWakeLock();
}

function handleMotion(event) {
    if (!isRunning) return;

    let x = event.beta;  // Nagib napred-nazad (-180 do 180)
    let y = event.gamma; // Nagib levo-desno (-90 do 90)
    let z = event.alpha; // Rotacija oko ose (0 do 360)

    // Ako je ovo prvi prolaz, samo zapiši početne pozicije
    if (lastX === null) {
        lastX = x; lastY = y; lastZ = z;
        return;
    }

    // Izračunaj koliko se telefon pomerio od poslednjeg čitanja
    let diffX = Math.abs(lastX - x);
    let diffY = Math.abs(lastY - y);

    // Ako je pomeraj veći od osetljivosti -> PALI ALARM
    if (diffX > SENSITIVITY || diffY > SENSITIVITY) {
        playAlarm();
    } else {
        // Ako miruje duže od 1.5 sekundi, ugasi alarm
        setTimeout(stopAlarm, 1500);
    }

    // Sačuvaj trenutne pozicije za sledeću proveru
    lastX = x; lastY = y; lastZ = z;
}

function playAlarm() {
    if (alarmPlaying) return;
    alarmPlaying = true;

    statusDisplay.textContent = "Status: VRATI TELEFON NA STO!";
    statusDisplay.style.color = "#ff4c4c";
    document.body.classList.add('alarm-active');

    // Generisanje piskavog tona kroz kod
    oscillator = audioCtx.createOscillator();
    oscillator.type = 'sawtooth'; // Iritantan zvuk rezanja
    oscillator.frequency.setValueAtTime(850, audioCtx.currentTime); // 850 Hz piskavo
    oscillator.connect(audioCtx.destination);
    oscillator.start();
}

function stopAlarm() {
    if (!alarmPlaying) return;
    alarmPlaying = false;

    statusDisplay.textContent = "Status: Mirno... Mozak se resetuje.";
    statusDisplay.style.color = "#66fcf1";
    document.body.classList.remove('alarm-active');

    if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
    }
}

function startTimer() {
    countdownInterval = setInterval(() => {
        timeLeft--;
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        
        timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            statusDisplay.textContent = "Uspjeh! Mozak ti je resetovan.";
            stopApp();
        }
    }, 1000);
}

function stopApp() {
    isRunning = false;
    clearInterval(countdownInterval);
    stopAlarm();
    window.removeEventListener('deviceorientation', handleMotion);
    startBtn.textContent = "POKRENI REBOOT";
    statusDisplay.textContent = "Status: Zaustavljeno";
    statusDisplay.style.color = "#c5c6c7";
    timeLeft = 600;
    timerDisplay.textContent = "10:00";
    lastX = null; lastY = null; lastZ = null;
}

// Funkcija koja drži ekran upaljenim
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.log(`Wake Lock greška: ${err.message}`);
    }
}