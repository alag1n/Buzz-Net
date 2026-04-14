// Плавная прокрутка для якорных ссылок
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Анимация при скролле - Intersection Observer
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -80px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Применяем анимацию к элементам при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.feature-card, .screenshot-item');
    
    animatedElements.forEach((el, index) => {
        el.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(el);
    });
});

// Обработка кнопки скачивания
const downloadBtn = document.getElementById('downloadBtn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', function(e) {
        console.log('Скачивание APK началось...');
    });
}

// Создание частиц на фоне
function createParticles() {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    document.body.appendChild(particlesContainer);
    
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 8 + 4;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 20}s`;
        particle.style.animationDuration = `${Math.random() * 10 + 15}s`;
        
        particlesContainer.appendChild(particle);
    }
}

// Запускаем создание частиц
document.addEventListener('DOMContentLoaded', createParticles);

// Parallax эффект для мыши
document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth - 0.5;
    const mouseY = e.clientY / window.innerHeight - 0.5;
    
    const particles = document.querySelectorAll('.particle');
    particles.forEach((particle, index) => {
        const speed = (index % 5 + 1) * 10;
        const x = mouseX * speed;
        const y = mouseY * speed;
        particle.style.transform = `translate(${x}px, ${y}px)`;
    });
});

// Проверка наличия APK файла
async function checkApkAvailability() {
    const apkUrl = 'https://raw.githubusercontent.com/alag1n/Buzz-Net/main/BuzzNet.apk';
    
    try {
        const response = await fetch(apkUrl, { method: 'HEAD' });
        if (!response.ok) {
            console.warn('APK файл временно недоступен');
            if (downloadBtn) {
                downloadBtn.style.opacity = '0.7';
                downloadBtn.style.cursor = 'not-allowed';
            }
        }
    } catch (error) {
        console.error('Ошибка проверки APK:', error);
    }
}

// Проверяем доступность APK при загрузке страницы
document.addEventListener('DOMContentLoaded', checkApkAvailability);
