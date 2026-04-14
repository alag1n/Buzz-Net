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

// Анимация при скролле
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Применяем анимацию к элементам
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.feature-card, .screenshot-item');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Обработка кнопки скачивания
const downloadBtn = document.getElementById('downloadBtn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', function(e) {
        // Отслеживание события скачивания (можно подключить Google Analytics)
        console.log('Скачивание APK началось...');
        
        // Можно добавить дополнительную логику здесь
        // Например, отправка события в аналитику
    });
}

// Параллакс эффект для hero секции
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.backgroundPositionY = `${scrolled * 0.5}px`;
    }
});

// Проверка наличия APK файла
async function checkApkAvailability() {
    const apkUrl = 'https://github.com/alag1n/Buzz-Net/releases/latest/download/BuzzNet.apk';
    
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
