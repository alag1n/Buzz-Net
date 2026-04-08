// Kinopoisk API Configuration
const API_CONFIG = {
    kinopoisk: {
        baseUrl: 'https://kinopoiskapiunofficial.tech/api/v2.2',
        apiKey: 'bac17c2e-8a75-43d9-8a85-505759f9fc99',
        imageBase: 'https://kinopoiskapiunofficial.tech/images'
    }
};

// State
let currentPage = 1;
let totalPages = 1;
let currentCategory = 'popular';
let moviesCache = [];
let isLoading = false;
let client = null;
let currentTorrent = null;

// ========================================
// Kinopoisk Fetch Functions
// ========================================
async function fetchFromKinopoisk(endpoint, params = {}) {
    const url = new URL(`${API_CONFIG.kinopoisk.baseUrl}${endpoint}`);
    
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
        const response = await fetch(url.toString(), {
            signal: controller.signal,
            headers: {
                'X-API-KEY': API_CONFIG.kinopoisk.apiKey,
                'Content-Type': 'application/json'
            }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`Kinopoisk Error: ${response.status}`);
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Kinopoisk fetch error:', error);
        throw error;
    }
}

function getPosterUrl(path) {
    if (!path) return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgMjAwIDMwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMxYTFhMmUiLz48dGV4dCB4PSIxMDAiIHk9IjE1MCIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzY2N2VlYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlBvc3RlcjwvdGV4dD48L3N2Zz4=';
    if (path.startsWith('http')) return path;
    return API_CONFIG.kinopoisk.imageBase + path;
}

// ========================================
// Movie Loading
// ========================================
async function loadMovies(page = 1, append = false) {
    if (isLoading) return;
    isLoading = true;
    
    const grid = document.getElementById('movies-grid');
    
    if (!append) {
        grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Загрузка фильмов...</p></div>';
    }

    try {
        const data = await fetchFromKinopoisk('/films/top', { page });
        
        if (data.films?.length > 0) {
            totalPages = Math.ceil(data.pagesCount || 1);
            
            const movies = data.films.map(film => ({
                id: film.kinopoiskId || film.filmId,
                title: film.nameRu || film.nameEn || film.nameOriginal || 'Unknown',
                poster_path: film.posterUrl,
                vote_average: film.rating ? parseFloat(film.rating) : 0,
                year: film.year,
                media_type: 'movie'
            }));
            
            if (!append) {
                moviesCache = movies;
                grid.innerHTML = '';
            } else {
                moviesCache = [...moviesCache, ...movies];
            }
            
            renderMovies(movies, append);
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
    card.dataset.year = movie.year || '';
    card.dataset.type = movie.media_type || 'movie';
    
    const posterUrl = getPosterUrl(movie.poster_path);
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const year = movie.year || '';
    
    card.innerHTML = `
        <div class="movie-poster">
            <img src="${posterUrl}" alt="${movie.title || movie.name}" loading="lazy">
            <div class="movie-overlay">
                <button class="play-btn"><i class="fas fa-play"></i></button>
                <div class="movie-info">
                    <span class="movie-rating"><i class="fas fa-star"></i> ${rating}</span>
                    <span class="movie-year">${year}</span>
                </div>
            </div>
        </div>
        <h4 class="movie-title">${movie.title || movie.name}</h4>
        <p class="movie-genre">Фильм</p>
    `;
    
    card.addEventListener('click', () => handleMovieClick(movie));
    
    return card;
}

async function handleMovieClick(movie) {
    const movieId = movie.id || movie.kinopoiskId || movie.filmId;
    if (!movieId) {
        console.error('No movie ID:', movie);
        alert('Не удалось открыть фильм');
        return;
    }
    const type = movie.media_type || 'movie';
    window.location.href = `movie.html?id=${movieId}&type=${type}`;
}

// ========================================
// Video Playback - Russian Torrent Sites
// ========================================
function showStreamingOptions(title, year) {
    const searchTitle = year ? `${title} ${year}` : title;
    
    const modal = document.createElement('div');
    modal.className = 'streaming-modal';
    modal.innerHTML = `
        <div class="streaming-content">
            <h3>Смотреть "${title}"</h3>
            <p style="color: #999; margin-bottom: 1rem;">Выберите сайт для поиска:</p>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <a href="https://rutor.info/search/${encodeURIComponent(searchTitle)}" 
                   target="_blank" class="btn-gradient" style="text-decoration: none; text-align: center; background: linear-gradient(135deg, #10b981, #059669);">
                    🔍 Rutor
                </a>
                <a href="https://rutracker.org/forum/index.php?nm=${encodeURIComponent(searchTitle)}" 
                   target="_blank" class="btn-gradient" style="text-decoration: none; text-align: center;">
                    🔍 Rutracker
                </a>
                <a href="https://nnmclub.to/forum/tracker.php?nm=${encodeURIComponent(searchTitle)}" 
                   target="_blank" class="btn-gradient" style="text-decoration: none; text-align: center; background: linear-gradient(135deg, #f59e0b, #d97706);">
                    🔍 NNM-Club
                </a>
            </div>
            <p style="color: #666; font-size: 0.8rem; text-align: center; margin-top: 1rem;">
                Найдите торрент, скопируйте magnet-ссылку и вставьте ниже:
            </p>
            <input type="text" id="magnet-input" placeholder="magnet:?xt=..." 
                   style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #333; 
                          background: #1a1a2e; color: white; margin: 1rem 0; font-family: monospace; font-size: 0.85rem;">
            <button class="btn-gradient" style="width: 100%;" onclick="playMagnet()">
                <i class="fas fa-play"></i> Воспроизвести
            </button>
            <button class="btn-gradient" style="margin-top: 0.5rem; background: linear-gradient(135deg, #f093fb, #f5576c);"
                    onclick="this.closest('.streaming-modal').remove()">
                Закрыть
            </button>
        </div>
    `;
    
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center;
        z-index: 10000; padding: 1rem;
    `;
    
    const content = modal.querySelector('.streaming-content');
    content.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        padding: 2rem; border-radius: 16px; max-width: 400px; width: 100%;
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function playMagnet() {
    const magnetInput = document.getElementById('magnet-input');
    const magnet = magnetInput?.value.trim();
    
    if (magnet && (magnet.startsWith('magnet:') || magnet.includes('magnet:'))) {
        document.querySelector('.streaming-modal')?.remove();
        
        // Загружаем WebTorrent
        if (typeof WebTorrent === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';
            script.onload = () => playWithWebTorrent(magnet);
            document.head.appendChild(script);
        } else {
            playWithWebTorrent(magnet);
        }
    } else {
        alert('Введите корректную magnet-ссылку');
    }
}

function playWithWebTorrent(magnet) {
    const client = new WebTorrent();
    
    const modal = document.createElement('div');
    modal.id = 'torrent-player-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: #000; z-index: 10001;
    `;
    modal.innerHTML = `
        <div style="position: absolute; top: 20px; right: 20px; z-index: 10002;">
            <button onclick="document.getElementById('torrent-player-modal').remove(); WebTorrent.prototype.destroy();" 
                    style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                ✕ Закрыть
            </button>
        </div>
        <div id="player-stats" style="position: absolute; bottom: 20px; left: 20px; color: white; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 8px; font-family: monospace;">
            Загрузка торрента...
        </div>
        <video id="torrent-video" controls style="width: 100%; height: 100%;"></video>
    `;
    
    document.body.appendChild(modal);
    
    client.add(magnet, (torrent) => {
        const video = document.getElementById('torrent-video');
        const stats = document.getElementById('player-stats');
        
        const file = torrent.files.find(f => {
            const ext = f.name.split('.').pop().toLowerCase();
            return ['mp4', 'webm', 'mkv', 'avi'].includes(ext);
        });
        
        if (file) {
            file.renderTo(video);
            video.play();
            stats.textContent = `Сидов: ${torrent.numPeers} | Загрузка...`;
            
            setInterval(() => {
                if (stats) {
                    stats.textContent = `Сидов: ${torrent.numPeers} | Скорость: ${formatSpeed(torrent.downloadSpeed)}`;
                }
            }, 1000);
        } else {
            stats.textContent = 'Видеофайл не найден';
        }
    });
}

function formatSpeed(bytes) {
    if (!bytes) return '0 B/s';
    if (bytes < 1024) return bytes + ' B/s';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB/s';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB/s';
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
        const data = await fetchFromKinopoisk('/films/search-by-keyword', { keyword: query });
        
        if (data.films?.length > 0) {
            const results = data.films.slice(0, 10);
            
            searchResults.innerHTML = results.map(item => {
                const posterUrl = getPosterUrl(item.posterUrl);
                const year = item.year || '';
                
                return `
                    <div class="search-result-item" data-movie='${JSON.stringify(item).replace(/'/g, "&#39;")}'>
                        <img src="${posterUrl}" alt="${item.nameRu || item.nameEn}">
                        <div class="result-info">
                            <h4>${item.nameRu || item.nameEn}</h4>
                            <span>${year}</span>
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
// Initialization
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

function initAllButtons() {
    document.getElementById('btn-watch-now')?.addEventListener('click', () => {
        document.getElementById('content')?.scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('btn-start-watch')?.addEventListener('click', () => {
        document.getElementById('content')?.scrollIntoView({ behavior: 'smooth' });
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelector('.search-modal')?.classList.remove('active');
            document.querySelector('.streaming-modal')?.remove();
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initMobileMenu();
    initTabs();
    initSearch();
    initAnimations();
    initCounters();
    initAllButtons();
    loadMovies();
});
