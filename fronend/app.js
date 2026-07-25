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

        if (elTotal) elTotal.textContent = totalFamilies;
        if (elAay) elAay.textContent = aayFamilies;
        if (elPhh) elPhh.textContent = phhFamilies;
        if (elPending) elPending.textContent = pendingFamilies;
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

            // Find latest distribution from real data
            let latestDistribution = null;
            rationCards.forEach(card => {
                if (card.received && card.distributionDate) {
                    if (!latestDistribution || new Date(card.distributionDate) > new Date(latestDistribution.distributionDate)) {
                        latestDistribution = card;
                    }
                }
            });

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let dateString = "No recent distribution";
            let nameString = "--";
            let typeString = "--";
            let txnString = "--";

            if (latestDistribution) {
                const lDate = new Date(latestDistribution.distributionDate);
                dateString = `${lDate.getDate()} ${monthNames[lDate.getMonth()]} ${lDate.getFullYear()}, ${lDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                nameString = latestDistribution.name || "--";
                typeString = latestDistribution.type || "--";
                txnString = 'TXN-' + latestDistribution.number;
            }

            cardList.innerHTML = `
                <div class="dashboard-single-container" style="max-width: 600px; margin: 20px auto; padding: 20px;">
                    <!-- Last Distribution Card -->
                    <div class="dashboard-card" style="box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; background: white; padding: 30px; border-radius: 12px; display: flex; flex-direction: column;">
                        <div class="dashboard-card-header" style="margin-bottom: 25px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 15px;">
                            <h3 style="margin:0; font-size: 1.3rem; color: #1e293b; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                                <span>📋</span> Last Distribution
                            </h3>
                        </div>
                        <table class="last-dist-table" style="width: 100%; border-collapse: collapse; font-size: 1rem; color: #475569; margin-bottom: 25px;">
                            <tr style="border-bottom: 1px solid #f8fafc;"><td style="padding: 12px 0; width: 40%; color: #64748b; font-weight: 500;">Date</td><td style="padding: 12px 0; font-weight: 700; color: #0f172a;">${dateString}</td></tr>
                            <tr style="border-bottom: 1px solid #f8fafc;"><td style="padding: 12px 0; color: #64748b; font-weight: 500;">Card Holder Name</td><td style="padding: 12px 0; font-weight: 700; color: #0f172a;">${nameString}</td></tr>
                            <tr style="border-bottom: 1px solid #f8fafc;"><td style="padding: 12px 0; color: #64748b; font-weight: 500;">Type of Card</td><td style="padding: 12px 0; font-weight: 700; color: #0f172a;">${typeString}</td></tr>
                            <tr><td style="padding: 12px 0; color: #64748b; font-weight: 500;">Transaction ID</td><td style="padding: 12px 0; font-weight: 700; color: #0f172a; font-family: monospace; font-size: 0.95rem;">${txnString}</td></tr>
                        </table>
                        <button class="btn-primary" id="dashboard-view-history-btn" style="width: 100%; margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; font-weight: bold; background-color: #2563eb; transition: 0.2s;" onmouseover="this.style.backgroundColor='#1d4ed8'" onmouseout="this.style.backgroundColor='#2563eb'">
                            <span>📄</span> View Full History
                        </button>
                    </div>
                </div>
            `;

            // Bind click event to View Full History button inside card
            const historyBtn = document.getElementById('dashboard-view-history-btn');
            if (historyBtn) {
                historyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const historyFamilies = rationCards.filter(c => c.received);
                    showListModal('Ration History', 'List of families who have received their ration in the current cycle.', historyFamilies);
                });
            }
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
            fetch(`${API_BASE}/api/ration-cards/${rationCards[index].id}`, {
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

                // Re-render analytics if currently viewing the Analysis page
                const analysisPage = document.getElementById('analysis-page');
                const isAnalysisVisible = analysisPage && !analysisPage.classList.contains('hidden');
                if (isAnalysisVisible) {
                    showAnalysisView();
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

    // --- Dynamic Search Bar Placeholders ---
    const searchTypeRadios = document.querySelectorAll('input[name="searchType"]');
    if (searchTypeRadios.length > 0 && searchBar) {
        const updatePlaceholder = () => {
            const checkedRadio = document.querySelector('input[name="searchType"]:checked');
            if (checkedRadio) {
                if (checkedRadio.value === 'name') {
                    searchBar.placeholder = 'Enter the name in Hindi...';
                } else if (checkedRadio.value === 'number') {
                    searchBar.placeholder = 'Enter the last 4 digits of ration card...';
                }
            }
        };

        searchTypeRadios.forEach(radio => {
            radio.addEventListener('change', updatePlaceholder);
        });

        // Initialize placeholder
        updatePlaceholder();
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
            
            // Ensure dashboard is visible
            const dashboardStats = document.getElementById('dashboard-stats');
            const searchCard = document.getElementById('search-card');
            const searchResultDisplay = document.getElementById('search-result-display');
            const analysisPage = document.getElementById('analysis-page');
            const dashboardBtn = document.getElementById('sidebar-dashboard-btn');
            const analysisBtn = document.getElementById('sidebar-analysis-btn');

            if (dashboardStats) dashboardStats.classList.remove('hidden');
            if (searchCard) searchCard.classList.remove('hidden');
            if (searchResultDisplay) searchResultDisplay.classList.remove('hidden');
            if (analysisPage) {
                analysisPage.classList.add('hidden');
                analysisPage.innerHTML = '';
            }

            if (dashboardBtn) dashboardBtn.classList.add('active');
            if (analysisBtn) analysisBtn.classList.remove('active');

            // Scroll and focus
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
            
            // Switch views
            const dashboardStats = document.getElementById('dashboard-stats');
            const searchCard = document.getElementById('search-card');
            const searchResultDisplay = document.getElementById('search-result-display');
            const analysisPage = document.getElementById('analysis-page');
            const analysisBtn = document.getElementById('sidebar-analysis-btn');

            if (dashboardStats) dashboardStats.classList.remove('hidden');
            if (searchCard) searchCard.classList.remove('hidden');
            if (searchResultDisplay) searchResultDisplay.classList.remove('hidden');
            if (analysisPage) {
                analysisPage.classList.add('hidden');
                analysisPage.innerHTML = ''; // Clear to prevent duplicate chart render IDs
            }

            dashboardBtn.classList.add('active');
            if (analysisBtn) analysisBtn.classList.remove('active');

            // Re-render simplified dashboard card (last distribution)
            renderCards();

            // Scroll to the top of the page smoothly
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

    // --- Analysis / Analytics Dashboard Page View ---
    function showAnalysisView() {
        const dashboardStats = document.getElementById('dashboard-stats');
        const searchCard = document.getElementById('search-card');
        const searchResultDisplay = document.getElementById('search-result-display');
        const analysisPage = document.getElementById('analysis-page');
        const dashboardBtn = document.getElementById('sidebar-dashboard-btn');
        const analysisBtn = document.getElementById('sidebar-analysis-btn');

        if (!analysisPage) return;

        // Calculate detailed analytics on-the-fly from the loaded rationCards data
        const totalFamilies = rationCards.length;
        if (totalFamilies === 0) {
            alert('No data loaded yet. Please wait or check the backend.');
            return;
        }

        const distributedFamilies = rationCards.filter(c => c.received).length;
        const pendingFamilies = totalFamilies - distributedFamilies;
        const distPct = Math.round((distributedFamilies / totalFamilies) * 100);

        const fingerScannedFamilies = rationCards.filter(c => c.fingerScanned).length;
        const fingerPct = Math.round((fingerScannedFamilies / totalFamilies) * 100);

        // Category summary breakdown
        let categories = {
            'PHH': { total: 0, distributed: 0, units: 0 },
            'AAY': { total: 0, distributed: 0, units: 0 },
            'BPL': { total: 0, distributed: 0, units: 0 } // fallback
        };

        let totalMembers = 0;
        let pendingMembers = 0;

        rationCards.forEach(card => {
            const type = (card.type || 'BPL').toUpperCase();
            const members = parseInt(card.members) || 0;
            totalMembers += members;

            if (!categories[type]) {
                categories[type] = { total: 0, distributed: 0, units: 0 };
            }

            categories[type].total++;
            categories[type].units += members;
            if (card.received) {
                categories[type].distributed++;
            } else {
                pendingMembers += members;
            }
        });

        // Calculate Averages and Requirements
        const avgFamilySize = (totalMembers / totalFamilies).toFixed(1);
        const pendingWheat = pendingMembers * 2;
        const pendingRice = pendingMembers * 3;

        // Build Table Rows
        let tableRows = '';
        for (let type in categories) {
            const cat = categories[type];
            if (cat.total > 0 || type !== 'BPL') {
                const pending = cat.total - cat.distributed;
                tableRows += `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px; font-weight: 600; color: #1e293b;">${type}</td>
                        <td style="padding: 12px; text-align: center;">${cat.total}</td>
                        <td style="padding: 12px; text-align: center; color: #16a34a; font-weight: 600;">${cat.distributed}</td>
                        <td style="padding: 12px; text-align: center; color: #e11d48; font-weight: 600;">${pending}</td>
                        <td style="padding: 12px; text-align: center;">${cat.units}</td>
                    </tr>
                `;
            }
        }

        // Calculate Stock properties for the Stock progress bars
        let totalUnits = 0;
        let distributedUnits = 0;
        rationCards.forEach(card => {
            const members = parseInt(card.members) || 0;
            totalUnits += members;
            if (card.received) {
                distributedUnits += members;
            }
        });

        const totalWheat = totalUnits * 2;
        const distWheat = distributedUnits * 2;
        const availWheat = totalWheat - distWheat;

        const totalRice = totalUnits * 3;
        const distRice = distributedUnits * 3;
        const availRice = totalRice - distRice;

        const getStatusProps = (avail, total) => {
            if (total === 0) return { pct: 0, color: '#16a34a', bg: '#dcfce7', textClass: '#166534', label: 'Good' };
            const pct = Math.round((avail / total) * 100);
            if (pct > 50) return { pct, color: '#16a34a', bg: '#dcfce7', textClass: '#166534', label: 'Good' };
            if (pct > 20) return { pct, color: '#f59e0b', bg: '#ffedd5', textClass: '#c2410c', label: 'Low' };
            return { pct, color: '#ef4444', bg: '#fee2e2', textClass: '#b91c1c', label: 'Critical' };
        };

        const wp = getStatusProps(availWheat, totalWheat);
        const rp = getStatusProps(availRice, totalRice);

        // Hide Dashboard elements
        if (dashboardStats) dashboardStats.classList.add('hidden');
        if (searchCard) searchCard.classList.add('hidden');
        if (searchResultDisplay) searchResultDisplay.classList.add('hidden');

        // Show Analysis element and populate HTML
        analysisPage.classList.remove('hidden');
        
        analysisPage.innerHTML = `
            <div class="analysis-page-container" style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #eef2f5; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                <h2 style="margin-top: 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 25px; font-weight: 800;">📊 Village Distribution Analytics</h2>
                
                <!-- KPI Widgets Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; margin-bottom: 25px;">
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(22,163,74,0.03);">
                        <div style="font-size: 0.9rem; color: #166534; font-weight: 700; margin-bottom: 8px;">Ration Distribution Progress</div>
                        <div style="font-size: 2.2rem; font-weight: 800; color: #14532d; line-height: 1.1; margin-bottom: 5px;">${distPct}%</div>
                        <div style="font-size: 0.8rem; color: #15803d; font-weight: 500;">${distributedFamilies} of ${totalFamilies} families completed</div>
                    </div>
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37,99,235,0.03);">
                        <div style="font-size: 0.9rem; color: #1e40af; font-weight: 700; margin-bottom: 8px;">Biometric Verification Rate</div>
                        <div style="font-size: 2.2rem; font-weight: 800; color: #1e3a8a; line-height: 1.1; margin-bottom: 5px;">${fingerPct}%</div>
                        <div style="font-size: 0.8rem; color: #1d4ed8; font-weight: 500;">${fingerScannedFamilies} of ${totalFamilies} families scanned</div>
                    </div>
                </div>

                <!-- Table & Requirements Grid -->
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 25px; margin-bottom: 30px;" class="analysis-mid-row">
                    <!-- Category Breakdown Table -->
                    <div>
                        <h3 style="font-size: 1.15rem; color: #1e293b; margin-top: 0; margin-bottom: 12px; font-weight: 700;">Category Wise Summary</h3>
                        <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: white;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; text-align: left;">
                                <thead style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                    <tr>
                                        <th style="padding: 12px 15px;">Card Type</th>
                                        <th style="padding: 12px 15px; text-align: center;">Total Cards</th>
                                        <th style="padding: 12px 15px; text-align: center;">Distributed</th>
                                        <th style="padding: 12px 15px; text-align: center;">Pending</th>
                                        <th style="padding: 12px 15px; text-align: center;">Total Units</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Requirements Summary -->
                    <div>
                        <h3 style="font-size: 1.15rem; color: #1e293b; margin-top: 0; margin-bottom: 12px; font-weight: 700;">Allocation Requirements</h3>
                        <div style="background: #fafaf9; border: 1px solid #e7e5e4; padding: 20px; border-radius: 8px; font-size: 0.95rem; line-height: 1.8; color: #475569; display: flex; flex-direction: column; gap: 10px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.01);">
                            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e7e5e4; padding-bottom: 6px;">
                                <span>Average Family Size:</span>
                                <strong style="color: #1e293b;">${avgFamilySize} members</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e7e5e4; padding-bottom: 6px;">
                                <span>Pending Wheat Req:</span>
                                <strong style="color: #991b1b;">${pendingWheat} Kg</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Pending Rice Req:</span>
                                <strong style="color: #1d4ed8;">${pendingRice} Kg</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3 Graphs/Widgets Section -->
                <h3 style="font-size: 1.3rem; color: #0f172a; margin-top: 40px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; font-weight: 800;">📈 Analytical Insights & Stock Status</h3>
                
                <div class="dashboard-grid" style="margin-top: 15px;">
                    
                    <!-- Col 1: Distribution Trend -->
                    <div class="dashboard-card" style="box-shadow: 0 4px 6px rgba(0,0,0,0.01); border: 1px solid #e2e8f0;">
                        <div class="dashboard-card-header">
                            <h3 style="font-size: 1.1rem; font-weight: 700;">Distribution Trend <span style="color:#64748b; font-size: 0.85rem; font-weight: normal;">(Daily)</span></h3>
                            <select>
                                <option>This Month</option>
                            </select>
                        </div>
                        <div class="trend-chart-container">
                            <canvas id="distribution-trend-chart"></canvas>
                        </div>
                    </div>

                    <!-- Col 2: Stock Status -->
                    <div class="dashboard-card" style="box-shadow: 0 4px 6px rgba(0,0,0,0.01); border: 1px solid #e2e8f0;">
                        <div class="dashboard-card-header" style="margin-bottom: 20px;">
                            <h3 style="margin:0; font-size: 1.1rem; font-weight: 700;">Stock Status</h3>
                        </div>
                        
                        <div class="stock-status-list">
                            <!-- Table Header -->
                            <div class="stock-status-header">
                                <div style="flex: 2;">Items</div>
                                <div style="flex: 3;">Available</div>
                                <div style="flex: 1; text-align: center;">Status</div>
                            </div>
                            
                            <!-- Row: Wheat -->
                            <div class="stock-status-row">
                                <div class="stock-status-item-name">Wheat</div>
                                <div class="stock-status-bar-container">
                                    <div class="stock-status-bar-bg">
                                        <div class="stock-status-bar-fill" style="width: ${wp.pct}%; background: ${wp.color};"></div>
                                    </div>
                                    <div class="stock-status-bar-val">${availWheat} Kg</div>
                                </div>
                                <div class="stock-status-badge-container">
                                    <span class="stock-status-badge" style="background: ${wp.bg}; color: ${wp.textClass};">${wp.label}</span>
                                </div>
                            </div>

                            <!-- Row: Rice -->
                            <div class="stock-status-row">
                                <div class="stock-status-item-name">Rice</div>
                                <div class="stock-status-bar-container">
                                    <div class="stock-status-bar-bg">
                                        <div class="stock-status-bar-fill" style="width: ${rp.pct}%; background: ${rp.color};"></div>
                                    </div>
                                    <div class="stock-status-bar-val">${availRice} Kg</div>
                                </div>
                                <div class="stock-status-badge-container">
                                    <span class="stock-status-badge" style="background: ${rp.bg}; color: ${rp.textClass};">${rp.label}</span>
                                </div>
                            </div>
                        </div>
                        
                        <button class="stock-view-btn" id="analysis-view-stock-btn">
                            <span>📄</span> View Stock Details
                        </button>
                    </div>

                    <!-- Col 3: Category Chart -->
                    <div class="dashboard-card" style="box-shadow: 0 4px 6px rgba(0,0,0,0.01); border: 1px solid #e2e8f0;">
                        <div class="dashboard-card-header" style="margin-bottom: 20px;">
                            <h3 style="margin:0; font-size: 1.1rem; font-weight: 700;">Distribution by Category <span style="color:#64748b; font-size: 0.85rem; font-weight: normal;">(This Month)</span></h3>
                        </div>
                        <div class="category-doughnut-container">
                            <div class="category-canvas-wrapper">
                                <canvas id="category-doughnut-chart"></canvas>
                                <div class="category-canvas-inner-label">
                                    <div class="total-num" id="doughnut-total">0</div>
                                    <div class="total-lbl">Total Families</div>
                                </div>
                            </div>
                            <div class="category-legend-list">
                                <div class="category-legend-row">
                                    <div class="category-legend-label">
                                        <div class="category-legend-dot" style="background-color: #16a34a;"></div>
                                        <span>Antyodaya (AAY)</span>
                                    </div>
                                    <strong class="category-legend-val" id="legend-aay">0 (0%)</strong>
                                </div>
                                <div class="category-legend-row">
                                    <div class="category-legend-label">
                                        <div class="category-legend-dot" style="background-color: #2563eb;"></div>
                                        <span>Priority Household (PHH)</span>
                                    </div>
                                    <strong class="category-legend-val" id="legend-phh">0 (0%)</strong>
                                </div>
                                <div class="category-legend-row">
                                    <div class="category-legend-label">
                                        <div class="category-legend-dot" style="background-color: #f59e0b;"></div>
                                        <span>Other (BPL)</span>
                                    </div>
                                    <strong class="category-legend-val" id="legend-bpl">0 (0%)</strong>
                                </div>
                            </div>
                        </div>
                        <button class="btn-cancel" id="analysis-view-cat-btn" style="width: 100%; margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <span class="nav-icon">📊</span> View Category Details
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bind dynamic action buttons
        const viewStockBtn = document.getElementById('analysis-view-stock-btn');
        if (viewStockBtn) {
            viewStockBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                const sidebarStockBtn = document.getElementById('sidebar-stock-btn');
                if (sidebarStockBtn) sidebarStockBtn.click();
            });
        }

        const viewCatBtn = document.getElementById('analysis-view-cat-btn');
        if (viewCatBtn) {
            viewCatBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                const sidebarOfficialBtn = document.getElementById('sidebar-official-lists-btn');
                if (sidebarOfficialBtn) sidebarOfficialBtn.click();
            });
        }

        // Add Active Styles to Sidebar
        if (analysisBtn) analysisBtn.classList.add('active');
        if (dashboardBtn) dashboardBtn.classList.remove('active');

        // Draw the charts
        renderTrendChart();
        renderCategoryWidgets();
    }

    const analysisBtn = document.getElementById('sidebar-analysis-btn');
    if (analysisBtn) {
        analysisBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAnalysisView();
        });
    }

    // --- Mobile Sidebar Responsive Navigation Drawers ---
    const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const appSidebar = document.getElementById('app-sidebar');

    function openSidebar() {
        if (appSidebar && sidebarOverlay) {
            appSidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent main page scrolling when menu open
        }
    }

    function closeSidebar() {
        if (appSidebar && sidebarOverlay) {
            appSidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', openSidebar);
    }
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', closeSidebar);
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Close mobile sidebar when clicking on a nav link on mobile view
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });

    // --- Initialize Dashboard Execution ---
    fetchCardsFromBackend();
});