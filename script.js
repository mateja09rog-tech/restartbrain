let isRunning = false;
let alarmPlaying = false;
let countdownInterval;
let alarmTimeout; // Pametni tajmer za sprečavanje seckanja
let timeLeft = 600;

let audioCtx = null;
let oscillator = null;

let lastX = null, lastY = null, lastZ = null;
const SENSITIVITY = 4; // Malo smanjena osetljivost da ne reaguje na disanje

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
    startBtn.textContent = "PREKINI REBOOT";
    startBtn.classList.add('active-mode');
    statusDisplay.textContent = "SADA SPUSTI TELEFON";
    statusDisplay.style.color = "#00ffcc";
    
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleMotion);
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener('deviceorientation', handleMotion);
    }

    startTimer();
    requestWakeLock();
}

function handleMotion(event) {
    if (!isRunning) return;

    let x = event.beta;
    let y = event.gamma;

    if (lastX === null) {
        lastX = x; lastY = y;
        return;
    }

    let diffX = Math.abs(lastX - x);
    let diffY = Math.abs(lastY - y);

    if (diffX > SENSITIVITY || diffY > SENSITIVITY) {
        // Ako je detektovan pokret, upali alarm (ili produži njegovo trajanje)
        playAlarm();
    }

    lastX = x; lastY = y;
}

function playAlarm() {
    // Ako se telefon pomerio, poništi prethodno zakazano gašenje zvuka
    clearTimeout(alarmTimeout);

    if (!alarmPlaying) {
        alarmPlaying = true;
        statusDisplay.textContent = "VRATI NA STO!";
        statusDisplay.style.color = "#ff3366";
        document.body.classList.add('alarm-active');

        // Pokretanje zvuka
        oscillator = audioCtx.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(900, audioCtx.currentTime); // Malo piskavija frekvencija
        oscillator.connect(audioCtx.destination);
        oscillator.start();
    }

    // Zakaži gašenje alarma tek NAKON što je telefon miran punih 1.2 sekunde
    alarmTimeout = setTimeout(stopAlarm, 1200);
}

function stopAlarm() {
    if (!alarmPlaying) return;
    alarmPlaying = false;

    statusDisplay.textContent = "FOKUS NA NIVOU...";
    statusDisplay.style.color = "#00ffcc";
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
            statusDisplay.textContent = "ZAVRŠENO!";
            stopApp();
        }
    }, 1000);
}

function stopApp() {
    isRunning = false;
    clearInterval(countdownInterval);
    clearTimeout(alarmTimeout);
    stopAlarm();
    window.removeEventListener('deviceorientation', handleMotion);
    
    startBtn.textContent = "POKRENI REBOOT";
    startBtn.classList.remove('active-mode');
    statusDisplay.textContent = "ČEKA SE POKRETANJE";
    statusDisplay.style.color = "#a0a0a0";
    timeLeft = 600;
    timerDisplay.textContent = "10:00";
    lastX = null; lastY = null;
}

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.log(`Wake Lock: ${err.message}`);
    }
}
