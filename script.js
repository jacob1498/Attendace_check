// Initialize Supabase
const supabaseUrl = 'https://enskmqmkvdrkttjlzusn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuc2ttcW1rdmRya3R0amx6dXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzkxMDQsImV4cCI6MjA5MDgxNTEwNH0.o1QFZP5TXyTfI3tveP1hjceOxnHsdjVdCNerq1Zmdho';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

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
    init: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            if (profile?.status === 'pending') ui.showView('pending');
            else if (profile) auth.loginSuccess(profile);
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
    login: async () => {
        const email = document.getElementById('login-username').value; // Supabase uses email
        const passInp = document.getElementById('login-password').value;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password: passInp });
        if (error) return alert(error.message);

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profile.status === 'pending') {
            ui.showView('pending');
        } else {
            auth.loginSuccess(profile);
        }
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

    signup: async () => {
        const email = document.getElementById('signup-username').value;
        const passInp = document.getElementById('signup-password').value;

        const { data, error } = await supabase.auth.signUp({ email, password: passInp });
        if (error) return alert(error.message);

        alert("Registration successful! Please check your email for confirmation (if enabled) and wait for Admin approval.");
        ui.showView('login');
    },

    logout: async () => {
        await supabase.auth.signOut();
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
    mark: async (type) => {
        await supabase.from('attendance_logs').insert([
            { user_id: currentUser.id, type: type }
        ]);
        attendance.renderLogs();
    },

    renderLogs: async () => {
        const { data: logs } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        const tbody = document.getElementById('user-logs-table');
        if (!tbody) return;
        tbody.innerHTML = logs.map((log) => `
            <tr>
                <td><span class="status-badge ${log.type.toLowerCase().replace(' ', '-')}">${log.type}</span></td>
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>...</td>
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
    currentPage: 1,
    rowsPerPage: 10,
    lastSearch: '',

    updateRows: () => {
        supervisor.rowsPerPage = parseInt(document.getElementById('supervisor-rows').value);
        supervisor.currentPage = 1;
        supervisor.renderLogs();
    },
    changePage: (dir) => {
        supervisor.currentPage += dir;
        supervisor.renderLogs();
    },
    addThirdParty: async () => {
        const nameInp = document.getElementById('third-party-name');
        if (!nameInp.value) return alert("Please enter a name");

        const { error } = await supabase.from('third_party_logs').insert([{
            name: nameInp.value,
            registeredBy: currentUser.username,
            in: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        if (error) return alert(error.message);

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

    quickLog: async (id, field) => {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const { error } = await supabase
            .from('third_party_logs')
            .update({ [field]: timeStr })
            .eq('id', id);
        
        if (error) alert(error.message);
        supervisor.renderLogs();
    },

    deleteEntry: async (id) => {
        if (!confirm(`Are you sure you want to delete this entry?`)) return;
        await supabase.from('third_party_logs').delete().eq('id', id);
        supervisor.renderLogs();
    },

    updateStats: (entries) => {
        const total = entries.length;
        const onBreak = entries.filter(e => e.break_out !== '-' && e.break_in === '-').length;
        const out = entries.filter(e => e.out !== '-').length;

        if (document.getElementById('stat-total')) {
            document.getElementById('stat-total').innerText = total;
            document.getElementById('stat-break').innerText = onBreak;
            document.getElementById('stat-out').innerText = out;
        }
    },

    renderLogs: async () => {
        const tbody = document.getElementById('third-party-table-body');
        const searchTerm = document.getElementById('third-party-search')?.value.toLowerCase() || '';
        let { data: entries } = await supabase.from('third_party_logs').select('*').order('created_at', { ascending: false });

        if (!entries) return;
        supervisor.updateStats(entries);

        if (searchTerm) {
            entries = entries.filter(e => e.name.toLowerCase().includes(searchTerm));
        }

        if (searchTerm !== supervisor.lastSearch) {
            supervisor.currentPage = 1;
            supervisor.lastSearch = searchTerm;
        }

        const totalPages = Math.ceil(entries.length / supervisor.rowsPerPage) || 1;
        if (supervisor.currentPage > totalPages) supervisor.currentPage = totalPages;
        if (supervisor.currentPage < 1) supervisor.currentPage = 1;

        const start = (supervisor.currentPage - 1) * supervisor.rowsPerPage;
        const paginatedEntries = entries.slice(start, start + supervisor.rowsPerPage);

        const pageInfo = document.getElementById('supervisor-page-info');
        if (pageInfo) pageInfo.innerText = `Page ${supervisor.currentPage} of ${totalPages}`;

        tbody.innerHTML = paginatedEntries.map(entry => `
            <tr>
                <td><strong>${entry.name}</strong><br><small style="color:var(--secondary-color)">By: ${entry.registered_by}</small></td>
                <td>${entry.in}</td>
                <td>${entry.break_out}</td>
                <td>${entry.break_in}</td>
                <td>${entry.out}</td>
                <td>
                    <div class="action-group">
                        <button title="Break" onclick="supervisor.quickLog('${entry.id}', 'break_out')" class="icon-btn" style="background:var(--accent-color);">
                            ${ICONS.break}
                        </button>
                        <button title="Return" onclick="supervisor.quickLog('${entry.id}', 'break_in')" class="icon-btn" style="background:var(--primary-color);">
                            ${ICONS.return}
                        </button>
                        <button title="Out" onclick="supervisor.quickLog('${entry.id}', 'out')" class="icon-btn" style="background:var(--secondary-color);">
                            ${ICONS.out}
                        </button>
                        <button title="Delete" onclick="supervisor.deleteEntry('${entry.id}')" class="icon-btn" style="background:var(--danger-color);">
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
    currentPage: 1,
    rowsPerPage: 5,

    updateRows: () => {
        admin.rowsPerPage = parseInt(document.getElementById('admin-rows').value);
        admin.currentPage = 1;
        admin.renderList();
    },
    changePage: (dir) => {
        admin.currentPage += dir;
        admin.renderList();
    },
    renderList: async () => {
        const { data: users } = await supabase.from('profiles').select('*').neq('role', 'admin');
        const tbody = document.getElementById('admin-user-list');

        if (!users) return;
        const totalPages = Math.ceil(users.length / admin.rowsPerPage) || 1;
        if (admin.currentPage > totalPages) admin.currentPage = totalPages;
        if (admin.currentPage < 1) admin.currentPage = 1;

        const start = (admin.currentPage - 1) * admin.rowsPerPage;
        const paginatedUsers = users.slice(start, start + admin.rowsPerPage);

        const pageInfo = document.getElementById('admin-page-info');
        if (pageInfo) pageInfo.innerText = `Page ${admin.currentPage} of ${totalPages}`;

        tbody.innerHTML = paginatedUsers.map(u => `
            <tr>
                <td><strong>${u.username}</strong></td>
                <td><span class="status-badge" style="background:${u.status === 'approved' ? 'var(--success-color)' : 'var(--secondary-color)'}">${u.status}</span></td>
                <td style="text-transform: capitalize;">${u.role}</td>
                <td>
                    <div class="action-group">
                        ${u.status === 'pending' ? 
                            `<button title="Approve User" onclick="admin.approve('${u.id}')" class="icon-btn" style="background:var(--success-color)">${ICONS.approve}</button>` : 
                            `<button title="Toggle Role" onclick="admin.toggleRole('${u.id}', '${u.role}')" class="icon-btn" style="background:var(--primary-color)">${ICONS.promote}</button>`
                        }
                        <button title="Delete User" onclick="admin.delete('${u.id}')" class="icon-btn" style="background:var(--danger-color)">${ICONS.delete}</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    toggleRole: async (id, currentRole) => {
        const newRole = currentRole === 'supervisor' ? 'user' : 'supervisor';
        await supabase.from('profiles').update({ role: newRole }).eq('id', id);
        admin.renderList();
    },

    approve: async (id) => {
        await supabase.from('profiles').update({ status: 'approved' }).eq('id', id);
        admin.renderList();
    },

    delete: async (id) => {
        if(!confirm('Are you sure?')) return;
        // Note: Actual user deletion requires Supabase Admin API or manual deletion in Dashboard
        await supabase.from('profiles').delete().eq('id', id);
        admin.renderList();
    }
};

// Initialize
storage.init();
