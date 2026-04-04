// Data Management
const ICONS = {
    delete: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
    approve: '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
    promote: '<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>',
    break: '<svg viewBox="0 0 24 24"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm-2 10c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V5h10v8zm2-5h-2V5h2v3z"/></svg>',
    return: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    out: '<svg viewBox="0 0 24 24"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59z"/></svg>'
};

const storage = {
    getUsers: () => JSON.parse(localStorage.getItem('att_users')) || [],
    saveUsers: (users) => localStorage.setItem('att_users', JSON.stringify(users)),
    getThirdParty: () => JSON.parse(localStorage.getItem('att_third_party')) || [],
    saveThirdParty: (data) => localStorage.setItem('att_third_party', JSON.stringify(data)),
    getSession: () => localStorage.getItem('att_session'),
    saveSession: (username) => username ? localStorage.setItem('att_session', username) : localStorage.removeItem('att_session'),
    init: () => {
        const users = storage.getUsers();
        if (!users.find(u => u.role === 'admin')) {
            users.push({ username: 'admin', password: 'admin123', role: 'admin', status: 'approved', logs: [] });
            storage.saveUsers(users);
        }

        // Restore session if exists
        const sessionUsername = storage.getSession();
        if (sessionUsername) {
            const user = users.find(u => u.username === sessionUsername);
            if (user) {
                if (user.status === 'pending') {
                    ui.showView('pending');
                } else {
                    auth.loginSuccess(user);
                }
            }
        }

        // Start real-time clock
        setInterval(() => {
            const clockEl = document.getElementById('real-time-clock');
            if (clockEl) {
                clockEl.innerText = new Date().toLocaleTimeString();
            }
        }, 1000);
    }
};

let currentUser = null;

// Authentication Logic
const auth = {
    login: () => {
        const userInp = document.getElementById('login-username').value;
        const passInp = document.getElementById('login-password').value;
        const users = storage.getUsers();
        const user = users.find(u => u.username === userInp && u.password === passInp);

        if (!user) return alert("Invalid credentials");
        
        if (user.status === 'pending') {
            ui.showView('pending');
            return;
        }

        storage.saveSession(user.username);
        auth.loginSuccess(user);
    },

    loginSuccess: (user) => {
        currentUser = user;
        document.getElementById('display-name').innerText = user.username;
        document.getElementById('logoutBtn').classList.remove('hidden');
        
        if (user.role === 'admin') {
            ui.showView('admin');
            admin.renderList();
        } else if (user.role === 'supervisor') {
            document.getElementById('supervisor-name').innerText = user.username;
            ui.showView('supervisor');
            supervisor.renderLogs();
        } else {
            ui.showView('user');
            attendance.renderLogs();
        }
    },

    signup: () => {
        const userInp = document.getElementById('signup-username').value;
        const passInp = document.getElementById('signup-password').value;
        const users = storage.getUsers();

        if (users.find(u => u.username === userInp)) return alert("Username exists");
        if (!userInp || !passInp) return alert("Fill all fields");

        users.push({
            username: userInp,
            password: passInp,
            role: 'user',
            status: 'pending',
            logs: []
        });

        storage.saveUsers(users);
        alert("Registration successful! Waiting for Admin approval.");
        ui.showView('login');
    },

    logout: () => {
        storage.saveSession(null);
        currentUser = null;
        document.getElementById('logoutBtn').classList.add('hidden');
        ui.showView('login');
    }
};

// UI Controller
const ui = {
    showView: (view) => {
        const sections = ['auth-section', 'user-dashboard', 'supervisor-dashboard', 'admin-dashboard', 'pending-view'];
        sections.forEach(s => document.getElementById(s).classList.add('hidden'));
        
        // Clear inputs and focus when switching auth views
        if (view === 'login' || view === 'signup') {
            document.querySelectorAll('input').forEach(i => i.value = '');
        }

        if (view === 'login') {
            document.getElementById('auth-section').classList.remove('hidden');
            document.getElementById('login-view').classList.remove('hidden');
            document.getElementById('signup-view').classList.add('hidden');
            setTimeout(() => document.getElementById('login-username').focus(), 100);
        } else if (view === 'signup') {
            document.getElementById('auth-section').classList.remove('hidden');
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('signup-view').classList.remove('hidden');
            setTimeout(() => document.getElementById('signup-username').focus(), 100);
        } else {
            document.getElementById(`${view}-dashboard` || `${view}-view`).classList.remove('hidden');
            if(view === 'pending') document.getElementById('pending-view').classList.remove('hidden');
        }
    }
};

// Add Enter Key Support
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const isLoginVisible = !document.getElementById('login-view').classList.contains('hidden');
        const isSignupVisible = !document.getElementById('signup-view').classList.contains('hidden');
        
        if (isLoginVisible) auth.login();
        else if (isSignupVisible) auth.signup();
    }
});

// Attendance Logic
const attendance = {
    mark: (type) => {
        const users = storage.getUsers();
        const userIdx = users.findIndex(u => u.username === currentUser.username);
        const log = { type, time: new Date().toLocaleString() };
        
        users[userIdx].logs.unshift(log);
        storage.saveUsers(users);
        currentUser = users[userIdx];
        
        if (currentUser.role === 'supervisor') supervisor.renderLogs();
        else attendance.renderLogs();
    },

    renderLogs: () => {
        const tbody = document.getElementById('user-logs-table');
        if (!tbody) return;
        tbody.innerHTML = currentUser.logs.map((log, index) => `
            <tr>
                <td><span class="status-badge ${log.type.toLowerCase().replace(' ', '-')}">${log.type}</span></td>
                <td>${log.time}</td>
                <td>
                    <button title="Delete Log" onclick="attendance.deleteLog(${index})" class="icon-btn" style="background:var(--danger-color)">
                        ${ICONS.delete}
                    </button>
                </td>
            </tr>
        `).join('');
    },

    deleteLog: (index) => {
        if (!confirm('Remove this log entry?')) return;
        const users = storage.getUsers();
        const userIdx = users.findIndex(u => u.username === currentUser.username);
        users[userIdx].logs.splice(index, 1);
        storage.saveUsers(users);
        currentUser = users[userIdx];
        attendance.renderLogs();
    }
};

// Supervisor / Assistant Admin Logic
const supervisor = {
    addThirdParty: () => {
        const nameInp = document.getElementById('third-party-name');
        if (!nameInp.value) return alert("Please enter a name");

        const entries = storage.getThirdParty();
        if (entries.find(e => e.name === nameInp.value)) return alert("This person is already registered.");

        entries.unshift({
            name: nameInp.value,
            registeredBy: currentUser.username,
            in: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            breakOut: '-',
            breakIn: '-',
            out: '-'
        });

        storage.saveThirdParty(entries);
        nameInp.value = '';
        supervisor.renderLogs();
        alert("3rd Party Registered Successfully");
    },

    scanPlaceholder: () => {
        const mockScan = prompt("Simulating Scanner... Please enter/scan ID code:");
        if (mockScan) {
            document.getElementById('third-party-name').value = `ID-${mockScan}`;
        }
    },

    quickLog: (name, field) => {
        const entries = storage.getThirdParty();
        const entry = entries.find(e => e.name === name);
        if (entry) {
            entry[field] = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            storage.saveThirdParty(entries);
            supervisor.renderLogs();
        }
    },

    deleteEntry: (name) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        let entries = storage.getThirdParty();
        entries = entries.filter(e => e.name !== name);
        storage.saveThirdParty(entries);
        supervisor.renderLogs();
    },

    updateStats: () => {
        const entries = storage.getThirdParty();
        const total = entries.length;
        const onBreak = entries.filter(e => e.breakOut !== '-' && e.breakIn === '-').length;
        const out = entries.filter(e => e.out !== '-').length;

        if (document.getElementById('stat-total')) {
            document.getElementById('stat-total').innerText = total;
            document.getElementById('stat-break').innerText = onBreak;
            document.getElementById('stat-out').innerText = out;
        }
    },

    renderLogs: () => {
        const tbody = document.getElementById('third-party-table-body');
        const searchTerm = document.getElementById('third-party-search')?.value.toLowerCase() || '';
        let entries = storage.getThirdParty();

        supervisor.updateStats();

        if (searchTerm) {
            entries = entries.filter(e => e.name.toLowerCase().includes(searchTerm));
        }

        tbody.innerHTML = entries.slice(0, 10).map(entry => `
            <tr>
                <td><strong>${entry.name}</strong><br><small style="color:var(--secondary-color)">By: ${entry.registeredBy}</small></td>
                <td>${entry.in}</td>
                <td>${entry.breakOut}</td>
                <td>${entry.breakIn}</td>
                <td>${entry.out}</td>
                <td>
                    <div class="action-group">
                        <button title="Break" onclick="supervisor.quickLog('${entry.name}', 'breakOut')" class="icon-btn" style="background:var(--accent-color);">
                            ${ICONS.break}
                        </button>
                        <button title="Return" onclick="supervisor.quickLog('${entry.name}', 'breakIn')" class="icon-btn" style="background:var(--primary-color);">
                            ${ICONS.return}
                        </button>
                        <button title="Out" onclick="supervisor.quickLog('${entry.name}', 'out')" class="icon-btn" style="background:var(--secondary-color);">
                            ${ICONS.out}
                        </button>
                        <button title="Delete" onclick="supervisor.deleteEntry('${entry.name}')" class="icon-btn" style="background:var(--danger-color);">
                            ${ICONS.delete}
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
};

// Admin Logic
const admin = {
    renderList: () => {
        const users = storage.getUsers().filter(u => u.role !== 'admin');
        const tbody = document.getElementById('admin-user-list');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td><strong>${u.username}</strong></td>
                <td><span class="status-badge" style="background:${u.status === 'approved' ? 'var(--success-color)' : 'var(--secondary-color)'}">${u.status}</span></td>
                <td style="text-transform: capitalize;">${u.role}</td>
                <td>
                    <div class="action-group">
                        ${u.status === 'pending' ? 
                            `<button title="Approve User" onclick="admin.approve('${u.username}')" class="icon-btn" style="background:var(--success-color)">${ICONS.approve}</button>` : 
                            `<button title="Toggle Role" onclick="admin.toggleRole('${u.username}')" class="icon-btn" style="background:var(--primary-color)">${ICONS.promote}</button>`
                        }
                        <button title="Delete User" onclick="admin.delete('${u.username}')" class="icon-btn" style="background:var(--danger-color)">${ICONS.delete}</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    toggleRole: (username) => {
        const users = storage.getUsers();
        const user = users.find(u => u.username === username);
        user.role = user.role === 'supervisor' ? 'user' : 'supervisor';
        storage.saveUsers(users);
        admin.renderList();
    },

    approve: (username) => {
        const users = storage.getUsers();
        const user = users.find(u => u.username === username);
        user.status = 'approved';
        storage.saveUsers(users);
        admin.renderList();
    },

    delete: (username) => {
        if(!confirm('Are you sure?')) return;
        let users = storage.getUsers();
        users = users.filter(u => u.username !== username);
        storage.saveUsers(users);
        admin.renderList();
    }
};

// Initialize
storage.init();