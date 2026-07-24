document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const cardList = document.getElementById('search-result-display'); // Points to our dynamic display container
    const searchBar = document.getElementById('search-bar');
    const searchBtn = document.getElementById('search-btn');
    const resetButton = document.getElementById('reset-button');
    const currentMonthEl = document.getElementById('current-month');
    const sidebarMonthEl = document.getElementById('sidebar-month');

    // --- Dynamic Date Initialization ---
    if (sidebarMonthEl) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const d = new Date();
        sidebarMonthEl.textContent = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }

    // --- State Management ---
    let rationCards = [];

    /**
     * Converts common English phonetic typing into basic Hindi characters
     * to allow English inputs to match Hindi database records.
     */
    function transliterateEnglishToHindi(text) {
        let input = text.toLowerCase().trim();
        if (!input) return "";

        // Character conversion matrix for regional phonetic matching
        const phoneticMap = {
            'sh': 'श', 'ch': 'च', 'th': 'थ', 'kh': 'ख', 'gh': 'घ', 'ph': 'फ', 'bh': 'भ',
            'a': 'ा', 'i': 'ि', 'e': 'े', 'o': 'ो', 'u': 'ु',
            'r': 'र', 'm': 'म', 'n': 'न', 's': 'स', 'v': 'व', 'w': 'व', 'y': 'य',
            't': 'त', 'd': 'द', 'p': 'प', 'b': 'ब', 'k': 'क', 'g': 'ग', 'j': 'ज', 'l': 'ल'
        };

        // Replace letter groups first, then individual characters
        let convertedText = input;

        // Handle explicit common letter groups first
        for (let key in phoneticMap) {
            if (key.length > 1) {
                const regex = new RegExp(key, 'g');
                convertedText = convertedText.replace(regex, phoneticMap[key]);
            }
        }

        // Handle individual characters
        for (let key in phoneticMap) {
            if (key.length === 1) {
                const regex = new RegExp(key, 'g');
                convertedText = convertedText.replace(regex, phoneticMap[key]);
            }
        }

        return convertedText;
    }

    /**
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://ration-app.onrender.com';

    /**
     * Fetches the active ration cards from our PostgreSQL database via backend server.
     */
    async function fetchCardsFromBackend() {
        try {
            const response = await fetch(`${API_BASE}/api/ration-cards`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            rationCards = await response.json();

            console.log(`Successfully fetched ${rationCards.length} cards from database.`);

            updateDashboardStats();

            // Render the initial placeholder instruction
            renderCards();
        } catch (error) {
            console.error('Failed to fetch ration cards from backend:', error);
            cardList.innerHTML = '<p style="text-align:center; color:red; font-weight:bold; margin-top:20px;">Error connecting to the server. Please ensure your backend is running.</p>';
        }
    }

    // Set the current month in the header
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    if (currentMonthEl) {
        currentMonthEl.textContent = `Month: ${currentMonth}`;
    }

    // --- Dynamic Header Date and Time ---
    function updateHeaderDateTime() {
        const dateEl = document.getElementById('current-date-header');
        const timeEl = document.getElementById('current-time-header');
        if (dateEl && timeEl) {
            const now = new Date();
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            
            const dayName = days[now.getDay()];
            const date = now.getDate();
            const monthName = months[now.getMonth()];
            const year = now.getFullYear();
            
            dateEl.textContent = `${dayName}, ${date} ${monthName} ${year}`;
            
            let hours = now.getHours();
            let minutes = now.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            
            timeEl.textContent = `${hours}:${minutes} ${ampm}`;
        }
    }
    
    updateHeaderDateTime();
    setInterval(updateHeaderDateTime, 1000);

    /**
     * Updates the top dashboard overview stats dynamically based on current data
     */
    function updateDashboardStats() {
        const totalFamilies = rationCards.length;
        const aayFamilies = rationCards.filter(c => c.type === 'AAY').length;
        const phhFamilies = rationCards.filter(c => c.type === 'PHH').length;
        // A family is pending if they haven't completed both steps
        const pendingFamilies = rationCards.filter(c => !c.received || !c.fingerScanned).length;
        // Some records might not have 'members' fully parsed as numbers, fallback to 0
        const totalMembers = rationCards.reduce((sum, card) => sum + (parseInt(card.members) || 0), 0);

        const elTotal = document.getElementById('stat-total-families');
        const elAay = document.getElementById('stat-aay-families');
        const elPhh = document.getElementById('stat-phh-families');
        const elPending = document.getElementById('stat-pending-families');
        const elMembers = document.getElementById('stat-total-members');

        if (elTotal) elTotal.textContent = totalFamilies;
        if (elAay) elAay.textContent = aayFamilies;
        if (elPhh) elPhh.textContent = phhFamilies;
        if (elPending) elPending.textContent = pendingFamilies;
        if (elMembers) elMembers.textContent = totalMembers;
    }

    /**
     * Saves the current list states to localStorage to preserve distribution checkboxes.
     */
    function saveData() {
        localStorage.setItem('rationCards', JSON.stringify(rationCards));
    }

    /**
     * Renders the Distribution Trend chart using Chart.js with real data
     */
    function renderTrendChart() {
        const ctx = document.getElementById('distribution-trend-chart');
        if (!ctx) return;
        
        // Prevent duplicate initializations if the canvas is re-rendered
        if (window.trendChartInstance) {
            window.trendChartInstance.destroy();
        }

        // Generate dynamic labels and data
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const d = new Date();
        const currentMonth = d.getMonth();
        const currentYear = d.getFullYear();
        const today = d.getDate();
        
        let dailyCounts = new Array(today).fill(0);
        
        rationCards.forEach(card => {
            if (card.received) {
                let cardDate = card.distributionDate ? new Date(card.distributionDate) : new Date(); // fallback
                if (cardDate.getMonth() === currentMonth && cardDate.getFullYear() === currentYear) {
                    const dayIndex = cardDate.getDate() - 1;
                    if (dayIndex >= 0 && dayIndex < today) {
                        dailyCounts[dayIndex]++;
                    }
                }
            }
        });
        
        let labels = [];
        for (let i = 1; i <= today; i++) {
            labels.push(`${i} ${monthNames[currentMonth]}`);
        }

        window.trendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Distributions',
                    data: dailyCounts,
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#16a34a',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0 /* 0 makes it jagged/straight lines like the image */
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        ticks: {
                            stepSize: 1,
                            color: '#64748b'
                        },
                        border: {
                            display: false
                        },
                        grid: {
                            color: '#f1f5f9',
                            drawTicks: false
                        }
                    },
                    x: {
                        ticks: {
                            color: '#64748b',
                            maxTicksLimit: 7
                        },
                        border: {
                            display: false
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    /**
     * Renders the dynamic widgets for Last Distribution and Category Doughnut chart
     */
    function renderCategoryWidgets() {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        // Setup Last Distribution Date and TXN ID from real data
        let latestDistribution = null;
        rationCards.forEach(card => {
            if (card.received && card.distributionDate) {
                if (!latestDistribution || new Date(card.distributionDate) > new Date(latestDistribution.distributionDate)) {
                    latestDistribution = card;
                }
            }
        });

        const dateEl = document.getElementById('last-dist-date');
        const txnEl = document.getElementById('last-dist-txn');
        const nameEl = document.getElementById('last-dist-name');
        const typeEl = document.getElementById('last-dist-type');
        
        if (latestDistribution) {
            const lDate = new Date(latestDistribution.distributionDate);
            const dateString = `${lDate.getDate()} ${monthNames[lDate.getMonth()]} ${lDate.getFullYear()}, ${lDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            if (dateEl) dateEl.textContent = dateString;
            // Generate a consistent TXN based on card number
            if (txnEl) txnEl.textContent = 'TXN-' + latestDistribution.number;
            if (nameEl) nameEl.textContent = latestDistribution.name || '--';
            if (typeEl) typeEl.textContent = latestDistribution.type || '--';
        } else {
            if (dateEl) dateEl.textContent = 'No recent distribution';
            if (txnEl) txnEl.textContent = '--';
            if (nameEl) nameEl.textContent = '--';
            if (typeEl) typeEl.textContent = '--';
        }

        // Calculate Stats
        let aayCount = 0;
        let phhCount = 0;
        let bplCount = 0;

        rationCards.forEach(card => {
            if (card.received) {
                const cType = card.type ? card.type.toUpperCase() : '';
                if (cType === 'AAY') aayCount++;
                else if (cType === 'PHH') phhCount++;
                else bplCount++; // For 'BPL' or others if they exist
            }
        });

        const totalDistributed = aayCount + phhCount + bplCount;

        // Update Legend
        const getPct = (cnt) => totalDistributed === 0 ? 0 : Math.round((cnt / totalDistributed) * 100);
        
        const aayPct = getPct(aayCount);
        const phhPct = getPct(phhCount);
        const bplPct = getPct(bplCount);

        const aayLegend = document.getElementById('legend-aay');
        const phhLegend = document.getElementById('legend-phh');
        const bplLegend = document.getElementById('legend-bpl');
        const totalEl = document.getElementById('doughnut-total');

        if (aayLegend) aayLegend.textContent = `${aayCount} (${aayPct}%)`;
        if (phhLegend) phhLegend.textContent = `${phhCount} (${phhPct}%)`;
        if (bplLegend) bplLegend.textContent = `${bplCount} (${bplPct}%)`;
        if (totalEl) totalEl.textContent = totalDistributed;

        // Initialize Chart
        const ctx = document.getElementById('category-doughnut-chart');
        if (!ctx) return;

        if (window.doughnutChartInstance) {
            window.doughnutChartInstance.destroy();
        }

        window.doughnutChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Antyodaya (AAY)', 'Priority Household (PHH)', 'Other (BPL)'],
                datasets: [{
                    data: [aayCount, phhCount, bplCount],
                    backgroundColor: ['#16a34a', '#2563eb', '#f59e0b'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        display: false // We use custom HTML legend
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null) label += context.parsed;
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Renders matching ration cards using the new professional profile card layout.
     */
    function renderCards() {
        const filter = searchBar.value.trim().toLowerCase();
        cardList.innerHTML = ''; // Reset container layout

        // If nothing is searched yet, show a clean friendly placeholder instruction
        if (!filter) {
            // Calculate Stock dynamically based on real data rules
            let totalUnits = 0;
            let distributedUnits = 0;
            let totalAAYCards = 0;
            let distributedAAYCards = 0;
            let totalCards = rationCards.length;
            let distributedCards = 0;

            rationCards.forEach(card => {
                const members = parseInt(card.members) || 0;
                totalUnits += members;
                if (card.type === 'AAY') totalAAYCards++;
                
                if (card.received) {
                    distributedUnits += members;
                    distributedCards++;
                    if (card.type === 'AAY') distributedAAYCards++;
                }
            });

            // Allocation Rules
            const totalWheat = totalUnits * 2;
            const distWheat = distributedUnits * 2;
            const availWheat = totalWheat - distWheat;

            const totalRice = totalUnits * 3;
            const distRice = distributedUnits * 3;
            const availRice = totalRice - distRice;
            
            // Helper function to generate bar properties
            const getStatusProps = (avail, total) => {
                if (total === 0) return { pct: 0, color: '#16a34a', bg: '#dcfce7', textClass: '#166534', label: 'Good' };
                const pct = Math.round((avail / total) * 100);
                if (pct > 50) return { pct, color: '#16a34a', bg: '#dcfce7', textClass: '#166534', label: 'Good' };
                if (pct > 20) return { pct, color: '#f59e0b', bg: '#ffedd5', textClass: '#c2410c', label: 'Low' };
                return { pct, color: '#ef4444', bg: '#fee2e2', textClass: '#b91c1c', label: 'Critical' };
            };

            const wp = getStatusProps(availWheat, totalWheat);
            const rp = getStatusProps(availRice, totalRice);

            cardList.innerHTML = `
                <div style="padding: 20px; max-width: 1200px;">
                    <p style="color:#7f8c8d; margin-bottom: 20px;">Enter a name or card number above and click Search to view details.</p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 20px;">
                        
                        <!-- Row 1, Col 1: Distribution Trend -->
                        <div style="background: white; padding: 25px; border-radius: 12px; border: 1px solid #eef2f5; box-shadow: 0 4px 15px rgba(0,0,0,0.02); display: flex; flex-direction: column; height: 100%;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <h3 style="margin: 0; color: #1e293b; font-size: 1.2rem; font-weight: 700;">Distribution Trend <span style="color:#64748b; font-size: 0.85rem; font-weight: normal;">(Daily)</span></h3>
                                <select style="padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.85rem; color: #475569; outline: none; background: white; cursor: pointer;">
                                    <option>This Month</option>
                                </select>
                            </div>
                            <div style="position: relative; height: 250px; width: 100%; flex-grow: 1;">
                                <canvas id="distribution-trend-chart"></canvas>
                            </div>
                        </div>

                        <!-- Row 1, Col 2: Last Distribution -->
                        <div style="background: white; padding: 25px; border-radius: 12px; border: 1px solid #eef2f5; box-shadow: 0 4px 15px rgba(0,0,0,0.02); display: flex; flex-direction: column; height: 100%;">
                            <h3 style="margin: 0 0 20px 0; color: #1e293b; font-size: 1.1rem; font-weight: 700;">Last Distribution</h3>
                            <table style="width: 100%; font-size: 0.95rem; color: #475569; border-spacing: 0 12px;">
                                <tr><td style="width: 35%;">Date</td><td style="font-weight: 600; color: #1e293b;" id="last-dist-date">--</td></tr>
                                <tr><td>Card Holder Name</td><td style="font-weight: 600; color: #1e293b;" id="last-dist-name">--</td></tr>
                                <tr><td>Type of Card</td><td style="font-weight: 600; color: #1e293b;" id="last-dist-type">--</td></tr>
                                <tr><td>Transaction ID</td><td style="font-weight: 600; color: #1e293b;" id="last-dist-txn">--</td></tr>
                            </table>
                            <button class="btn-primary" style="width: 100%; margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <span class="nav-icon">📄</span> View Full History
                            </button>
                        </div>
                        
                        <!-- Row 2, Col 1: Stock Status -->
                        <div style="background: white; padding: 25px; border-radius: 12px; border: 1px solid #eef2f5; box-shadow: 0 4px 15px rgba(0,0,0,0.02); display: flex; flex-direction: column; height: 100%;">
                            <h3 style="margin: 0 0 20px 0; color: #1e293b; font-size: 1.2rem; font-weight: 700;">Stock Status</h3>
                            
                            <div style="display: flex; flex-direction: column; flex-grow: 1;">
                                <!-- Table Header -->
                                <div style="display: flex; font-size: 0.95rem; font-weight: 700; color: #334155; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; margin-bottom: 10px;">
                                    <div style="flex: 2;">Items</div>
                                    <div style="flex: 3;">Available</div>
                                    <div style="flex: 1; text-align: center;">Status</div>
                                </div>
                                
                                <!-- Row: Wheat -->
                                <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px dashed #f1f5f9;">
                                    <div style="flex: 2; font-weight: 700; color: #991b1b;">Wheat</div>
                                    <div style="flex: 3; display: flex; align-items: center; gap: 15px;">
                                        <div style="flex: 1; background: #f1f5f9; height: 8px; border-radius: 4px; overflow: hidden;">
                                            <div style="width: ${wp.pct}%; background: ${wp.color}; height: 100%; border-radius: 4px;"></div>
                                        </div>
                                        <div style="width: 75px; font-weight: 700; color: #1e293b; font-size: 0.95rem;">${availWheat} Kg</div>
                                    </div>
                                    <div style="flex: 1; display: flex; justify-content: center;">
                                        <span style="background: ${wp.bg}; color: ${wp.textClass}; padding: 4px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 700;">${wp.label}</span>
                                    </div>
                                </div>

                                <!-- Row: Rice -->
                                <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px dashed #f1f5f9;">
                                    <div style="flex: 2; font-weight: 700; color: #991b1b;">Rice</div>
                                    <div style="flex: 3; display: flex; align-items: center; gap: 15px;">
                                        <div style="flex: 1; background: #f1f5f9; height: 8px; border-radius: 4px; overflow: hidden;">
                                            <div style="width: ${rp.pct}%; background: ${rp.color}; height: 100%; border-radius: 4px;"></div>
                                        </div>
                                        <div style="width: 75px; font-weight: 700; color: #1e293b; font-size: 0.95rem;">${availRice} Kg</div>
                                    </div>
                                    <div style="flex: 1; display: flex; justify-content: center;">
                                        <span style="background: ${rp.bg}; color: ${rp.textClass}; padding: 4px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 700;">${rp.label}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button style="width: 100%; margin-top: 15px; padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b; font-weight: 700; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                                <span style="color: #334155; font-size: 1.1rem;">📄</span> View Stock Details
                            </button>
                        </div>

                        <!-- Row 2, Col 2: Category Chart -->
                        <div style="background: white; padding: 25px; border-radius: 12px; border: 1px solid #eef2f5; box-shadow: 0 4px 15px rgba(0,0,0,0.02); display: flex; flex-direction: column; height: 100%;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <h3 style="margin: 0; color: #1e293b; font-size: 1.1rem; font-weight: 700;">Distribution by Category <span style="color:#64748b; font-size: 0.85rem; font-weight: normal;">(This Month)</span></h3>
                            </div>
                            <div style="display: flex; align-items: center; gap: 20px; flex-grow: 1;">
                                <div style="position: relative; height: 160px; width: 160px; flex-shrink: 0;">
                                    <canvas id="category-doughnut-chart"></canvas>
                                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                                        <div style="font-size: 1.5rem; font-weight: bold; color: #1e293b;" id="doughnut-total">0</div>
                                        <div style="font-size: 0.75rem; color: #64748b;">Total Families</div>
                                    </div>
                                </div>
                                <div style="flex: 1; font-size: 0.85rem; color: #475569; display: flex; flex-direction: column; gap: 12px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <div style="width: 12px; height: 12px; border-radius: 3px; background-color: #16a34a;"></div>
                                            <span>Antyodaya (AAY)</span>
                                        </div>
                                        <strong style="color: #1e293b;" id="legend-aay">0 (0%)</strong>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <div style="width: 12px; height: 12px; border-radius: 3px; background-color: #2563eb;"></div>
                                            <span>Priority Household (PHH)</span>
                                        </div>
                                        <strong style="color: #1e293b;" id="legend-phh">0 (0%)</strong>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <div style="width: 12px; height: 12px; border-radius: 3px; background-color: #f59e0b;"></div>
                                            <span>Other (BPL)</span>
                                        </div>
                                        <strong style="color: #1e293b;" id="legend-bpl">0 (0%)</strong>
                                    </div>
                                </div>
                            </div>
                            <button class="btn-cancel" style="width: 100%; margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <span class="nav-icon">📊</span> View Category Details
                            </button>
                        </div>
                    </div>
                </div>
            `;
            renderTrendChart();
            renderCategoryWidgets();
            return;
        }

        // Detect which radio filtering strategy is currently active
        const searchType = document.querySelector('input[name="searchType"]:checked').value;

        // Perform a highly flexible substring search across languages
        const filteredCards = rationCards.filter(card => {
            const currentCardNumber = card.number.trim().toLowerCase();
            const currentCardName = card.name.trim().toLowerCase();

            if (searchType === 'number') {
                return currentCardNumber.includes(filter);
            } else {
                // Generate the Hindi phonetic conversion of whatever English they typed
                const hindiApproximation = transliterateEnglishToHindi(filter);

                // Match succeeds if typed in Hindi directly OR if the phonetic conversion matches
                const matchesDirectly = currentCardName.includes(filter);
                const matchesPhonetically = currentCardName.includes(hindiApproximation);

                return matchesDirectly || matchesPhonetically;
            }
        });

        if (filteredCards.length === 0) {
            cardList.innerHTML = '<p style="text-align:center; color:#e74c3c; font-weight:bold; padding:20px;">No matching official ration card records found.</p>';
            return;
        }

        // Generate the premium card views dynamically
        filteredCards.forEach((card) => {
            // Re-find original master array index securely to support mapping status changes
            const masterIndex = rationCards.findIndex(rc => rc.number === card.number);

            const statusClass = card.received ? 'received' : 'not-received';
            const statusText = card.received ? 'Received' : 'Not Received';
            const fingerClass = card.fingerScanned ? 'scanned' : 'not-scanned';
            const fingerText = card.fingerScanned ? 'Finger Scanned' : 'Finger Not Scanned';

            // Dynamic type configuration mapping layer
            const isAAY = card.type === 'AAY';
            const cardTypeName = isAAY ? 'AAY (अंत्योदय)' : 'PHH (पात्र गृहस्थी)';

            const headerStyle = isAAY ? 'background-color: #fff7ed; border-bottom: 1px solid #ffedd5;' : '';
            const titleStyle = isAAY ? 'color: #c2410c;' : '';
            const badgeClass = isAAY ? 'background-color: #ffedd5; color: #c2410c; border: 1px solid #fed7aa;' : 'background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0;';

            const profileCard = document.createElement('div');
            profileCard.className = 'profile-card';

            profileCard.innerHTML = `
                <div class="profile-header" style="${headerStyle}">
                    <h3 style="${titleStyle}">Ration Card Details</h3>
                    <span class="badge-active" style="${badgeClass}">${isAAY ? 'AAY Active' : 'PHH Active'}</span>
                </div>
                <div class="profile-body">
                    <div class="profile-row">
                        <div class="profile-label">Ration Card No.</div>
                        <div class="profile-value">${card.number}</div>
                    </div>
                    <div class="profile-row">
                        <div class="profile-label">Head of Family</div>
                        <div class="profile-value">${card.name}</div>
                    </div>
                    <div class="profile-row">
                        <div class="profile-label">Total Members</div>
                        <div class="profile-value">${card.members}</div>
                    </div>
                    <div class="profile-row">
                        <div class="profile-label">Card Type</div>
                        <div class="profile-value" style="font-weight: 700; ${titleStyle}">${cardTypeName}</div>
                    </div>
                </div>
                </div>
                <div class="profile-action-row" style="display: flex; flex-direction: column; gap: 15px; padding: 0 20px 20px 20px;">
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="finger-toggle ${fingerClass}" data-index="${masterIndex}">${fingerText}</button>
                        <button class="status-toggle ${statusClass}" data-index="${masterIndex}">${statusText}</button>
                    </div>
                    <div style="display: flex; justify-content: flex-end;">
                        <button class="save-toggle" data-index="${masterIndex}" disabled style="background-color: #94a3b8; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: not-allowed; transition: 0.2s;">💾 Save Changes</button>
                    </div>
                </div>
            `;
            cardList.appendChild(profileCard);
        });
    }

    /**
     * Handles distribution toggle updates within the dynamic view panel
     */
    function handleListClick(e) {
        if (e.target.classList.contains('status-toggle')) {
            // Visual toggle only - don't save yet
            if (e.target.classList.contains('received')) {
                e.target.classList.replace('received', 'not-received');
                e.target.textContent = 'Not Received';
            } else {
                e.target.classList.replace('not-received', 'received');
                e.target.textContent = 'Received';
            }
            
            // Enable the save button
            const saveBtn = e.target.closest('.profile-action-row').querySelector('.save-toggle');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.style.backgroundColor = '#16a34a';
                saveBtn.style.cursor = 'pointer';
            }
        } else if (e.target.classList.contains('finger-toggle')) {
            // Visual toggle only - don't save yet
            if (e.target.classList.contains('scanned')) {
                e.target.classList.replace('scanned', 'not-scanned');
                e.target.textContent = 'Finger Not Scanned';
            } else {
                e.target.classList.replace('not-scanned', 'scanned');
                e.target.textContent = 'Finger Scanned';
            }

            // Enable the save button
            const saveBtn = e.target.closest('.profile-action-row').querySelector('.save-toggle');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.style.backgroundColor = '#16a34a';
                saveBtn.style.cursor = 'pointer';
            }
        } else if (e.target.classList.contains('save-toggle')) {
            // Actually save the data
            if (e.target.disabled) return;
            
            const index = e.target.dataset.index;
            if (index === undefined) return;

            const actionRow = e.target.closest('.profile-action-row');
            const fingerBtn = actionRow.querySelector('.finger-toggle');
            const statusBtn = actionRow.querySelector('.status-toggle');

            // Read the visual state and apply it to the data
            const isNowReceived = statusBtn.classList.contains('received');
            const wasReceived = rationCards[index].received;

            rationCards[index].fingerScanned = fingerBtn.classList.contains('scanned');
            rationCards[index].received = isNowReceived;

            // Track distribution date for the real-time chart
            if (isNowReceived && !wasReceived) {
                rationCards[index].distributionDate = new Date().toISOString();
            } else if (!isNowReceived) {
                delete rationCards[index].distributionDate;
            } else if (isNowReceived && !rationCards[index].distributionDate) {
                 rationCards[index].distributionDate = new Date().toISOString();
            }

            // Show saving status
            e.target.textContent = '⏳ Saving...';
            e.target.disabled = true;
            e.target.style.cursor = 'not-allowed';

            // Send PUT request to update status in PostgreSQL database
            fetch(`${API_BASE}/api/ration-cards/${rationCards[index].number}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    received: rationCards[index].received,
                    fingerScanned: rationCards[index].fingerScanned,
                    distributionDate: rationCards[index].distributionDate || null
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update card');
                }
                return response.json();
            })
            .then(() => {
                updateDashboardStats(); // Update dashboard count when saved

                // Re-render chart if we are on the dashboard view (search bar empty)
                if (!searchBar.value.trim()) {
                    renderTrendChart();
                    renderCategoryWidgets();
                }

                // Visual feedback
                e.target.textContent = '✅ Saved!';
                e.target.style.backgroundColor = '#681da8';
                e.target.disabled = true;
                e.target.style.cursor = 'not-allowed';
                
                setTimeout(() => {
                    e.target.textContent = '💾 Save Changes';
                    e.target.style.backgroundColor = '#94a3b8';
                }, 2000);
            })
            .catch(err => {
                console.error("Save error:", err);
                e.target.textContent = '❌ Failed!';
                e.target.style.backgroundColor = '#dc2626';
                e.target.disabled = false;
                e.target.style.cursor = 'pointer';
                alert('Error saving data to database. Check if the server is running.');
            });
        }
    }

    /**
     * Resets distribution tracking states for the next seasonal allocation cycle
     */
    function resetAllStatus() {
        if (confirm('Are you sure you want to reset the "Received" and "Finger Scanned" status for ALL cards? This should be done at the start of a new month.')) {
            fetch(`${API_BASE}/api/ration-cards/reset`, {
                method: 'POST'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Reset failed');
                }
                return response.json();
            })
            .then(() => {
                rationCards.forEach(card => {
                    card.received = false;
                    card.fingerScanned = false;
                    delete card.distributionDate;
                });
                updateDashboardStats(); // Update dashboard count
                renderCards();
                alert('All tracking statuses have been reset for the new month.');
            })
            .catch(err => {
                console.error("Reset error:", err);
                alert('Error resetting statuses. Make sure your server is running.');
            });
        }
    }

    /**
     * Generates a printable table of all ration cards and triggers the print dialog
     */
    function generateAndPrintReport(selectedMonth) {
        const printContainer = document.getElementById('print-report-container');
        if (!printContainer) return;

        let dateStr = new Date().toLocaleDateString();
        
        let html = `
            <div class="print-header">
                <h1>Distribution Report - ${selectedMonth}</h1>
                <p>Official UP NFSA Ration Card Snapshot (Generated: ${dateStr})</p>
            </div>
            <table class="print-table">
                <thead>
                    <tr>
                        <th>S.No.</th>
                        <th>Ration Card No.</th>
                        <th>Holder Name</th>
                        <th>Card Type</th>
                        <th>Unit</th>
                        <th>Finger Scanned?</th>
                        <th>Ration Taken?</th>
                    </tr>
                </thead>
                <tbody>
        `;

        rationCards.forEach((card, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${card.number}</td>
                    <td>${card.name}</td>
                    <td>${card.type}</td>
                    <td>${card.members}</td>
                    <td>${card.fingerScanned ? 'Yes' : 'No'}</td>
                    <td>${card.received ? 'Yes' : 'No'}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        printContainer.innerHTML = html;
        window.print();
    }

    // --- Action Event Bindings ---
    // 1. Fixed Search Button Click Handler
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any default form behavior
            renderCards();
        });
    }

    // 2. Fixed Search Bar Enter Key Handler
    if (searchBar) {
        searchBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                renderCards();
            }
        });
    }

    // 3. Status Toggles and Reset Bindings
    if (cardList) {
        cardList.addEventListener('click', handleListClick);
    }

    if (resetButton) {
        resetButton.addEventListener('click', resetAllStatus);
    }

    const sidebarSearchBtn = document.getElementById('sidebar-search-btn');
    if (sidebarSearchBtn && searchBar) {
        sidebarSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
            searchBar.focus();
            
            // Add a brief highlight effect
            const originalShadow = searchBar.style.boxShadow;
            searchBar.style.boxShadow = "0 0 0 4px rgba(59, 130, 246, 0.5)";
            searchBar.style.transition = "box-shadow 0.3s ease";
            setTimeout(() => {
                searchBar.style.boxShadow = originalShadow;
            }, 1500);
        });
    }

    const sidebarHistoryBtn = document.getElementById('sidebar-history-btn');
    if (sidebarHistoryBtn) {
        sidebarHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const historyFamilies = rationCards.filter(c => c.received);
            showListModal('Ration History', 'List of families who have received their ration in the current cycle.', historyFamilies);
        });
    }

    const sidebarReportsBtn = document.getElementById('sidebar-reports-btn');
    const reportModal = document.getElementById('report-modal');
    const cancelReportBtn = document.getElementById('cancel-report-btn');
    const confirmReportBtn = document.getElementById('confirm-report-btn');
    const reportMonthSelect = document.getElementById('report-month-select');

    if (sidebarReportsBtn && reportModal) {
        sidebarReportsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            reportModal.classList.add('show');
        });

        cancelReportBtn.addEventListener('click', () => {
            reportModal.classList.remove('show');
        });

        confirmReportBtn.addEventListener('click', () => {
            const selectedMonth = reportMonthSelect.value;
            reportModal.classList.remove('show');
            generateAndPrintReport(selectedMonth);
        });
    }

    const pendingStatCard = document.getElementById('pending-stat-card');
    const totalStatCard = document.getElementById('total-stat-card');
    const aayStatCard = document.getElementById('aay-stat-card');
    const phhStatCard = document.getElementById('phh-stat-card');
    
    const listModal = document.getElementById('list-modal');
    const closeListBtn = document.getElementById('close-list-btn');
    const listTableBody = document.getElementById('list-table-body');
    const listModalTitle = document.getElementById('list-modal-title');
    const listModalDesc = document.getElementById('list-modal-desc');

    const listModalTabs = document.getElementById('list-modal-tabs');

    function renderListTable(dataList, emptyMessage) {
        if (dataList.length === 0) {
            listTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #16a34a; font-weight: bold;">${emptyMessage}</td></tr>`;
        } else {
            let html = '';
            dataList.forEach((card, idx) => {
                html += `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px; color: #64748b;">${idx + 1}</td>
                        <td style="padding: 12px; font-weight: 600; color: #0f172a;">${card.number}</td>
                        <td style="padding: 12px; font-weight: 500;">${card.name}</td>
                        <td style="padding: 12px; color: #475569;">${card.members}</td>
                    </tr>
                `;
            });
            listTableBody.innerHTML = html;
        }
    }

    function showListModal(title, desc, dataList) {
        if (!listModal) return;
        
        listModalTitle.textContent = title;
        listModalDesc.textContent = desc;
        
        // Clear tabs for standard lists
        if (listModalTabs) listModalTabs.innerHTML = '';
        
        renderListTable(dataList, "No families found in this category.");
        
        listModal.classList.add('show');
    }

    if (totalStatCard) {
        totalStatCard.addEventListener('click', () => {
            showListModal('Total Families', 'List of all registered families in the village.', rationCards);
        });
    }

    if (aayStatCard) {
        aayStatCard.addEventListener('click', () => {
            const aayList = rationCards.filter(c => c.type === 'AAY');
            showListModal('AAY Families', 'List of Antyodaya Anna Yojana (AAY) card holders.', aayList);
        });
    }

    if (phhStatCard) {
        phhStatCard.addEventListener('click', () => {
            const phhList = rationCards.filter(c => c.type === 'PHH');
            showListModal('PHH Families', 'List of Patra Grihasthi (PHH) priority card holders.', phhList);
        });
    }

    if (pendingStatCard) {
        pendingStatCard.addEventListener('click', () => {
            if (!listModal) return;

            const pendingFamilies = rationCards.filter(c => !c.received || !c.fingerScanned);
            const pendingPHH = pendingFamilies.filter(c => c.type === 'PHH');
            const pendingAAY = pendingFamilies.filter(c => c.type === 'AAY');

            listModalTitle.textContent = 'Pending Families';
            listModalDesc.textContent = 'List of families who have not completed distribution yet.';

            if (listModalTabs) {
                listModalTabs.innerHTML = `
                    <button id="tab-all-pending" style="border: none; padding: 6px 15px; border-radius: 20px; font-weight: bold; cursor: pointer; background: #3b82f6; color: white; transition: 0.2s;">All Pending (${pendingFamilies.length})</button>
                    <button id="tab-phh-pending" style="border: none; padding: 6px 15px; border-radius: 20px; font-weight: bold; cursor: pointer; background: #e2e8f0; color: #475569; transition: 0.2s;">PHH Pending (${pendingPHH.length})</button>
                    <button id="tab-aay-pending" style="border: none; padding: 6px 15px; border-radius: 20px; font-weight: bold; cursor: pointer; background: #e2e8f0; color: #475569; transition: 0.2s;">AAY Pending (${pendingAAY.length})</button>
                `;

                const btnAll = document.getElementById('tab-all-pending');
                const btnPHH = document.getElementById('tab-phh-pending');
                const btnAAY = document.getElementById('tab-aay-pending');

                const resetBtnStyles = () => {
                    [btnAll, btnPHH, btnAAY].forEach(btn => {
                        btn.style.background = '#e2e8f0';
                        btn.style.color = '#475569';
                    });
                };

                btnAll.addEventListener('click', () => {
                    resetBtnStyles();
                    btnAll.style.background = '#3b82f6';
                    btnAll.style.color = 'white';
                    renderListTable(pendingFamilies, 'All families have successfully completed distribution! 🎉');
                });

                btnPHH.addEventListener('click', () => {
                    resetBtnStyles();
                    btnPHH.style.background = '#3b82f6';
                    btnPHH.style.color = 'white';
                    renderListTable(pendingPHH, 'All PHH families have completed distribution!');
                });

                btnAAY.addEventListener('click', () => {
                    resetBtnStyles();
                    btnAAY.style.background = '#3b82f6';
                    btnAAY.style.color = 'white';
                    renderListTable(pendingAAY, 'All AAY families have completed distribution!');
                });
            }

            renderListTable(pendingFamilies, 'All families have successfully completed distribution! 🎉');
            listModal.classList.add('show');
        });
    }

    if (closeListBtn) {
        closeListBtn.addEventListener('click', () => {
            listModal.classList.remove('show');
        });
    }

    const kotedarProfileBtn = document.getElementById('kotedar-profile-btn');
    const kotedarModal = document.getElementById('kotedar-modal');
    const closeKotedarBtn = document.getElementById('close-kotedar-btn');

    if (kotedarProfileBtn && kotedarModal) {
        kotedarProfileBtn.addEventListener('click', () => {
            kotedarModal.classList.add('show');
        });

        closeKotedarBtn.addEventListener('click', () => {
            kotedarModal.classList.remove('show');
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === kotedarModal) {
                kotedarModal.classList.remove('show');
            }
        });
    }

    const dashboardBtn = document.getElementById('sidebar-dashboard-btn');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Scroll to the top of the page smoothly to show the dashboard
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const officialListsBtn = document.getElementById('sidebar-official-lists-btn');
    const officialListsModal = document.getElementById('official-lists-modal');
    const closeOfficialListsBtn = document.getElementById('close-official-lists-btn');

    if (officialListsBtn && officialListsModal) {
        officialListsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            officialListsModal.classList.add('show');
        });

        if (closeOfficialListsBtn) {
            closeOfficialListsBtn.addEventListener('click', () => {
                officialListsModal.classList.remove('show');
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === officialListsModal) {
                officialListsModal.classList.remove('show');
            }
        });
    }

    const stockBtn = document.getElementById('sidebar-stock-btn');
    const stockModal = document.getElementById('stock-modal');
    const closeStockBtn = document.getElementById('close-stock-btn');

    if (stockBtn && stockModal) {
        stockBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Calculate Stock dynamically based on real data rules
            let totalUnits = 0;
            let distributedUnits = 0;
            let totalAAYCards = 0;
            let distributedAAYCards = 0;
            let totalCards = rationCards.length;
            let distributedCards = 0;

            rationCards.forEach(card => {
                const members = parseInt(card.members) || 0;
                totalUnits += members;
                if (card.type === 'AAY') totalAAYCards++;
                
                if (card.received) {
                    distributedUnits += members;
                    distributedCards++;
                    if (card.type === 'AAY') distributedAAYCards++;
                }
            });

            // Rules: Wheat = 2kg/unit, Rice = 3kg/unit
            const totalWheat = totalUnits * 2;
            const totalRice = totalUnits * 3;
            
            const distributedWheat = distributedUnits * 2;
            const distributedRice = distributedUnits * 3;
            
            const availableWheat = totalWheat - distributedWheat;
            const availableRice = totalRice - distributedRice;

            // Populate DOM
            const wheatAllottedEl = document.getElementById('stock-wheat-allotted');
            const wheatDistributedEl = document.getElementById('stock-wheat-distributed');
            const wheatAvailableEl = document.getElementById('stock-wheat-available');
            
            const riceAllottedEl = document.getElementById('stock-rice-allotted');
            const riceDistributedEl = document.getElementById('stock-rice-distributed');
            const riceAvailableEl = document.getElementById('stock-rice-available');

            if (wheatAllottedEl) wheatAllottedEl.textContent = `${totalWheat} kg`;
            if (wheatDistributedEl) wheatDistributedEl.textContent = `${distributedWheat} kg`;
            if (wheatAvailableEl) wheatAvailableEl.textContent = `${availableWheat} kg`;

            if (riceAllottedEl) riceAllottedEl.textContent = `${totalRice} kg`;
            if (riceDistributedEl) riceDistributedEl.textContent = `${distributedRice} kg`;
            if (riceAvailableEl) riceAvailableEl.textContent = `${availableRice} kg`;

            stockModal.classList.add('show');
        });

        if (closeStockBtn) {
            closeStockBtn.addEventListener('click', () => {
                stockModal.classList.remove('show');
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === stockModal) {
                stockModal.classList.remove('show');
            }
        });
    }

    const settingsBtn = document.getElementById('sidebar-settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const settingsResetCycleBtn = document.getElementById('settings-reset-cycle-btn');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            settingsModal.classList.add('show');
        });

        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                settingsModal.classList.remove('show');
            });
        }

        if (settingsResetCycleBtn) {
            settingsResetCycleBtn.addEventListener('click', () => {
                resetAllStatus();
                settingsModal.classList.remove('show');
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('show');
            }
        });
    }

    // --- Initialize Dashboard Execution ---
    fetchCardsFromBackend();
});