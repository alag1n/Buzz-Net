// ========================================
// Buzz-Net - Streaming Platform
// TMDB + Torrent API Integration
// ========================================

// API Configuration
const API_CONFIG = {
    tmdb: {
        baseUrl: 'https://api.themoviedb.org/3',
        apiKey: '62b1158de0dc11c6aac6963181a0e3d3',
        accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2MmIxMTU4ZGUwZGMxMWM2YWFjNjk2MzE4MWEwZTNkMyIsIm5iZiI6MTc3NTU5NzU5MC41MjEsInN1YiI6IjY5ZDU3ODE2ZTQ2MGEwNzk3ZTZhZTVjMiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.ehTg5jP-BvO11ldob0mGB7IPEr-3kGZMOCc5zncAXCE',
        timeout: 10000
    },
    omdb: {
        baseUrl: 'https://www.omdbapi.com',
        apiKey: '85e8937e',
        timeout: 5000
    }
};

// State
let currentPage = 1;
let currentCategory = 'movie';
let totalPages = 1;
let isLoading = false;
let moviesCache = [];
let client = null;
let currentTorrent = null;

function getTmdbImageUrl(path, size = 'w500') {
    if (!path) return 'https://via.placeholder.com/500x750/1a1a2e/667eea?text=No+Image';
    if (path.startsWith('http')) return path;
    return `https://media.themoviedb.org/t/p/${size}${path}`;
}

// ========================================
// Initialize
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initMobileMenu();
    initAnimations();
    initCounters();
    initTabs();
    initSearch();
    initSmoothScroll();
    initParallax();
    initWebTorrent();
    initAllButtons();
    loadMovies();
});

// ========================================
// TMDB API Functions
// ========================================
async function fetchFromTMDB(endpoint, params = {}) {
    const url = new URL(`${API_CONFIG.tmdb.baseUrl}${endpoint}`);
    url.searchParams.append('api_key', API_CONFIG.tmdb.apiKey);
    url.searchParams.append('language', 'ru-RU');
    
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.tmdb.timeout);
    
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Authorization': `Bearer ${API_CONFIG.tmdb.accessToken}`
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`TMDB Error: ${response.status}`);
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function loadMovies(page = 1, append = false) {
    if (isLoading) return;
    isLoading = true;
    
    const grid = document.getElementById('movies-grid');
    
    if (!append) {
        grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Загрузка фильмов...</p></div>';
    }

    try {
        let endpoint;
        switch (currentCategory) {
            case 'tv':
                endpoint = '/tv/popular';
                break;
            case 'top':
                endpoint = '/movie/top_rated';
                break;
            default:
                endpoint = '/movie/popular';
        }

        const data = await fetchFromTMDB(endpoint, { page });
        
        if (data.results?.length > 0) {
            totalPages = data.total_pages;
            
            if (!append) {
                moviesCache = data.results;
                grid.innerHTML = '';
            } else {
                moviesCache = [...moviesCache, ...data.results];
            }
            
            renderMovies(data.results, append);
        } else {
            throw new Error('No results');
        }
    } catch (error) {
        console.error('Load error:', error);
        showError('Не удалось загрузить фильмы. Проверьте подключение к интернету.');
    } finally {
        isLoading = false;
    }
}

function renderMovies(movies, append = false) {
    const grid = document.getElementById('movies-grid');
    
    movies.forEach((movie, index) => {
        const card = createMovieCard(movie, index);
        grid.appendChild(card);
    });

    requestAnimationFrame(() => {
        document.querySelectorAll('.movie-card:not(.aos-animate)').forEach(el => {
            el.classList.add('aos-animate');
        });
    });
}

function createMovieCard(movie, index = 0) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.aos = 'zoom-in';
    card.dataset.aosDelay = Math.min(index * 30, 300);
    card.dataset.id = movie.id;
    card.dataset.title = movie.title || movie.name;
    card.dataset.year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
    card.dataset.type = movie.media_type || currentCategory;
    
    const posterUrl = movie.poster_path
        ? getTmdbImageUrl(movie.poster_path, 'w500')
        : getTmdbImageUrl(movie.backdrop_path, 'w500');
    
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const year = card.dataset.year || '';
    
    card.innerHTML = `
        <div class="movie-poster">
            <img src="${posterUrl}" alt="${movie.title || movie.name}" loading="lazy" crossorigin="anonymous" referrerpolicy="no-referrer"
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/500x750/1a1a2e/667eea?text=No+Image'">
            <div class="movie-overlay">
                <button class="play-btn"><i class="fas fa-play"></i></button>
                <div class="movie-info">
                    <span class="movie-rating"><i class="fas fa-star"></i> ${rating}</span>
                    <span class="movie-year">${year}</span>
                </div>
            </div>
        </div>
        <h4 class="movie-title">${movie.title || movie.name}</h4>
        <p class="movie-genre">${getGenres(movie.genre_ids)}</p>
    `;
    
    card.addEventListener('click', () => handleMovieClick(movie));
    
    return card;
}

const GENRE_MAP = {
    28: 'Боевик', 12: 'Приключения', 16: 'Мультфильм', 35: 'Комедия',
    80: 'Криминал', 99: 'Документальный', 18: 'Драма', 10751: 'Семейный',
    14: 'Фэнтези', 36: 'История', 27: 'Ужасы', 10402: 'Музыка',
    9648: 'Мистика', 10749: 'Мелодрама', 878: 'Фантастика', 10770: 'ТВ фильм',
    53: 'Триллер', 10752: 'Война', 37: 'Вестерн'
};

function getGenres(ids) {
    if (!ids?.length) return 'Фильм';
    return ids.slice(0, 2).map(id => GENRE_MAP[id]).filter(Boolean).join(', ') || 'Фильм';
}

async function handleMovieClick(movie) {
    const title = movie.title || movie.name;
    const year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
    const type = movie.media_type || currentCategory;
    
    const torrent = await searchTorrent(title, year, type);
    
    if (torrent) {
        playTorrent(torrent, title);
    } else {
        showNotification(`Торрент для "${title}" не найден`, 'warning');
    }
}

// ========================================
// Torrent Search Functions
// ========================================
async function searchTorrent(title, year, type) {
    showManualSearchModal(title, year, type);
    return null;
}

function showManualSearchModal(title, year, type) {
    const existing = document.querySelector('.manual-search-modal');
    if (existing) existing.remove();
    
    const searchTitle = year ? `${title} ${year}` : title;
    
    const modal = document.createElement('div');
    modal.className = 'manual-search-modal';
    modal.innerHTML = `
        <div class="manual-search-content">
            <h3>Воспроизведение</h3>
            <p>Для "${title}"</p>
            <p style="font-size: 0.9em; color: #999; margin-bottom: 1rem;">
                Найдите торрент вручную и вставьте magnet-ссылку:
            </p>
            <div style="margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
                <a href="https://yts.mx/browse-movies/${encodeURIComponent(searchTitle)}" target="_blank" 
                   class="btn-gradient" style="padding: 0.5rem 1rem; font-size: 0.85rem; text-decoration: none;">YTS</a>
                <a href="https://1337x.to/search/${encodeURIComponent(searchTitle)}/1/" target="_blank"
                   class="btn-gradient" style="padding: 0.5rem 1rem; font-size: 0.85rem; text-decoration: none;">1337x</a>
                <a href="https://thepiratebay.org/search.php?q=${encodeURIComponent(searchTitle)}" target="_blank"
                   class="btn-gradient" style="padding: 0.5rem 1rem; font-size: 0.85rem; text-decoration: none;">PirateBay</a>
                <a href="https://rutor.info/search/${encodeURIComponent(searchTitle)}" target="_blank"
                   class="btn-gradient" style="padding: 0.5rem 1rem; font-size: 0.85rem; text-decoration: none;">Rutor</a>
            </div>
            <input type="text" id="magnet-input" placeholder="magnet:?xt=..." 
                   style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #333; 
                          background: #1a1a2e; color: white; margin-bottom: 1rem; font-family: monospace; font-size: 0.85rem;">
            <div style="display: flex; gap: 1rem;">
                <button id="play-magnet-btn" class="btn-gradient" style="flex: 1;">
                    <i class="fas fa-play"></i> Воспроизвести
                </button>
                <button id="cancel-magnet-btn" class="btn-gradient" style="flex: 1; background: linear-gradient(135deg, #f093fb, #f5576c);">
                    <i class="fas fa-times"></i> Отмена
                </button>
            </div>
        </div>
    `;
    
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center;
        z-index: 10000; padding: 1rem;
    `;
    
    const content = modal.querySelector('.manual-search-content');
    content.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        padding: 2rem; border-radius: 16px; max-width: 500px; width: 100%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#play-magnet-btn').addEventListener('click', () => {
        const magnetInput = modal.querySelector('#magnet-input');
        const magnet = magnetInput.value.trim();
        
        if (magnet && (magnet.startsWith('magnet:') || magnet.includes('magnet:'))) {
            modal.remove();
            playTorrent({
                magnet: magnet,
                title: title,
                source: 'Manual'
            }, title);
        } else {
            showNotification('Введите корректную magnet-ссылку', 'warning');
        }
    });
    
    modal.querySelector('#cancel-magnet-btn').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function formatSize(bytes) {
    if (!bytes) return 'Unknown';
    const num = parseInt(bytes);
    if (isNaN(num)) return bytes;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(num) / Math.log(1024));
    return (num / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

// ========================================
// WebTorrent Player
// ========================================
function initWebTorrent() {
    if (typeof WebTorrent === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';
        script.onload = () => {
            client = new WebTorrent();
            client.on('error', err => console.error('WebTorrent error:', err));
        };
        document.head.appendChild(script);
    } else {
        client = new WebTorrent();
        client.on('error', err => console.error('WebTorrent error:', err));
    }
}

function playTorrent(torrent, title) {
    if (!client) {
        showNotification('WebTorrent не загружен', 'error');
        return;
    }
    
    showNotification(`Загрузка "${title}"...`, 'info');
    
    let magnetUri = torrent.magnet;
    if (!magnetUri.includes('tr=')) {
        magnetUri += '&tr=udp://tracker.opentrackr.org:1337&tr=udp://open.stealth.si:80/announce';
    }
    
    if (currentTorrent) {
        currentTorrent.destroy();
    }
    
    client.add(magnetUri, (addedTorrent) => {
        currentTorrent = addedTorrent;
        
        const videoFile = addedTorrent.files.find(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            return ['mp4', 'webm', 'mkv', 'avi', 'mov'].includes(ext);
        });
        
        if (videoFile) {
            openPlayer(videoFile, addedTorrent, title);
        } else {
            showNotification('Видеофайл не найден', 'warning');
        }
    });

    client.on('error', (err) => {
        showNotification('Ошибка: ' + err.message, 'error');
    });
}

function openPlayer(file, torrent, title) {
    const playerModal = document.getElementById('player-modal');
    const videoPlayer = document.getElementById('video-player');
    const playerTitle = document.getElementById('player-title');
    
    if (!playerModal || !videoPlayer) return;
    
    if (playerTitle) playerTitle.textContent = title;
    
    file.renderTo(videoPlayer, (err) => {
        if (err) {
            showNotification('Ошибка воспроизведения', 'error');
            return;
        }
        
        playerModal.classList.add('active');
        videoPlayer.play().catch(() => {});
        showNotification('Воспроизведение начато', 'success');
    });
    
    const statsInterval = setInterval(() => {
        if (!playerModal.classList.contains('active')) {
            clearInterval(statsInterval);
            return;
        }
        updatePlayerStats(torrent);
    }, 1000);
}

function updatePlayerStats(torrent) {
    const downloadSpeed = document.getElementById('download-speed');
    const uploadSpeed = document.getElementById('upload-speed');
    const peersCount = document.getElementById('peers-count');
    const progress = document.getElementById('progress');
    
    if (downloadSpeed) downloadSpeed.textContent = formatSpeed(torrent.downloadSpeed);
    if (uploadSpeed) uploadSpeed.textContent = formatSpeed(torrent.uploadSpeed);
    if (peersCount) peersCount.textContent = torrent.numPeers;
    if (progress) progress.textContent = Math.round(torrent.progress * 100) + '%';
}

function formatSpeed(bytesPerSec) {
    if (bytesPerSec < 1024) return bytesPerSec + ' B/s';
    if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
    return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
}

function closePlayerModal() {
    const playerModal = document.getElementById('player-modal');
    const videoPlayer = document.getElementById('video-player');
    
    if (playerModal) playerModal.classList.remove('active');
    if (videoPlayer) {
        videoPlayer.pause();
        videoPlayer.src = '';
    }
    
    if (currentTorrent) {
        currentTorrent.destroy();
        currentTorrent = null;
    }
}

// ========================================
// UI Functions
// ========================================
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentCategory = btn.dataset.category;
            currentPage = 1;
            loadMovies(1, false);
        });
    });
    
    document.getElementById('load-more-btn')?.addEventListener('click', () => {
        if (currentPage < totalPages && !isLoading) {
            currentPage++;
            loadMovies(currentPage, true);
        }
    });
}

function showError(message) {
    const grid = document.getElementById('movies-grid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f093fb; margin-bottom: 1rem;"></i>
            <h3 style="margin-bottom: 0.5rem;">Ошибка</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">${message}</p>
            <button class="btn-gradient" onclick="loadMovies()">
                <i class="fas fa-redo"></i> Повторить
            </button>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    document.querySelector('.notification')?.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    const colors = {
        success: 'linear-gradient(135deg, #10b981, #059669)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        info: 'linear-gradient(135deg, #667eea, #764ba2)'
    };
    
    notification.innerHTML = `
        <i class="fas fa-${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed; top: 100px; right: 20px; padding: 1rem 1.5rem;
        background: ${colors[type] || colors.info}; color: white;
        border-radius: 12px; display: flex; align-items: center; gap: 0.75rem;
        font-weight: 500; z-index: 9999; animation: slideIn 0.3s ease;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ========================================
// Search
// ========================================
function initSearch() {
    const searchBtn = document.querySelector('.btn-search');
    const searchModal = document.querySelector('.search-modal');
    const closeSearch = document.querySelector('.close-search');
    const searchInput = document.querySelector('.search-input-wrapper input');

    searchBtn?.addEventListener('click', () => {
        searchModal?.classList.add('active');
        setTimeout(() => searchInput?.focus(), 300);
    });

    closeSearch?.addEventListener('click', () => {
        searchModal?.classList.remove('active');
    });

    searchModal?.addEventListener('click', (e) => {
        if (e.target === searchModal) searchModal.classList.remove('active');
    });

    searchInput?.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length > 2) {
            await performSearch(query);
        } else {
            document.querySelector('.search-results').innerHTML = '';
        }
    }, 500));
}

async function performSearch(query) {
    const searchResults = document.querySelector('.search-results');
    if (!searchResults) return;
    
    searchResults.innerHTML = '<div class="loading"><div class="spinner" style="width:30px;height:30px;margin:auto"></div></div>';

    try {
        const data = await fetchFromTMDB('/search/multi', { query });
        
        if (data.results?.length > 0) {
            const results = data.results
                .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
                .slice(0, 10);
            
            searchResults.innerHTML = results.map(item => {
                const posterUrl = item.poster_path 
                    ? getTmdbImageUrl(item.poster_path, 'w92')
                    : 'https://via.placeholder.com/60x90/1a1a2e/667eea?text=No';
                
                return `
                    <div class="search-result-item" data-movie='${JSON.stringify(item).replace(/'/g, "&#39;")}'>
                        <img src="${posterUrl}" alt="${item.title || item.name}" crossorigin="anonymous"
                             onerror="this.src='https://via.placeholder.com/60x90/1a1a2e/667eea?text=No'">
                        <div class="result-info">
                            <h4>${item.title || item.name}</h4>
                            <span>${item.media_type === 'tv' ? 'Сериал' : 'Фильм'} • ${(item.release_date || item.first_air_date || '').substring(0, 4)}</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const movie = JSON.parse(item.dataset.movie);
                    document.querySelector('.search-modal')?.classList.remove('active');
                    handleMovieClick(movie);
                });
            });
        } else {
            searchResults.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1rem">Ничего не найдено</p>';
        }
    } catch (error) {
        searchResults.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1rem">Ошибка поиска</p>';
    }
}

// ========================================
// Other Initializations
// ========================================
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        navbar?.classList.toggle('scrolled', currentScroll > 50);
        
        if (currentScroll > lastScroll && currentScroll > 200) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        lastScroll = currentScroll;
    });
}

function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');

    menuBtn?.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        mobileMenu?.classList.toggle('active');
        document.body.style.overflow = mobileMenu?.classList.contains('active') ? 'hidden' : '';
    });

    document.querySelectorAll('.mobile-nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            menuBtn?.classList.remove('active');
            mobileMenu?.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('aos-animate'), entry.target.dataset.aosDelay || 0);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));
}

function initCounters() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-number').forEach(el => observer.observe(el));
}

function animateCounter(element) {
    const target = parseInt(element.dataset.target);
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const update = () => {
        current += step;
        if (current < target) {
            element.textContent = formatNum(Math.floor(current));
            requestAnimationFrame(update);
        } else {
            element.textContent = formatNum(target);
        }
    };
    update();
}

function formatNum(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(0) + 'M+';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K+';
    return num + '+';
}

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function initParallax() {
    const orbs = document.querySelectorAll('.gradient-orb');
    
    window.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        orbs.forEach((orb, i) => {
            const speed = (i + 1) * 20;
            orb.style.transform = `translate(${(x - 0.5) * speed}px, ${(y - 0.5) * speed}px)`;
        });
    });
}

function initAllButtons() {
    document.getElementById('btn-watch-now')?.addEventListener('click', () => {
        document.getElementById('content')?.scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('btn-start-watch')?.addEventListener('click', () => {
        document.getElementById('content')?.scrollIntoView({ behavior: 'smooth' });
    });
    
    document.querySelector('.close-player')?.addEventListener('click', closePlayerModal);
    document.getElementById('player-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'player-modal') closePlayerModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePlayerModal();
            document.querySelector('.search-modal')?.classList.remove('active');
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Styles for notifications
const styles = document.createElement('style');
styles.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(styles);
