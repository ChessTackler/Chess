// 1. Initialize Supabase
const supabaseUrl = 'https://vwzcdfgbqaszhqlvewch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...[PASTE_YOUR_FULL_KEY_HERE]';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. Fetch & Display Players
async function fetchPlayers(tableBodyId, isAdmin = false) {
    const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .order('fide_rating', { ascending: false });

    if (error) {
        console.error('Error fetching players:', error);
        return;
    }

    const tbody = document.getElementById(tableBodyId);
    tbody.innerHTML = ''; // Clear loading text

    players.forEach(player => {
        const tr = document.createElement('tr');
        
        if (isAdmin) {
            // Admin View (Condensed + Delete Button)
            tr.innerHTML = `
                <td>${player.first_name} ${player.last_name}</td>
                <td>${player.fide_rating || 'Unrated'}</td>
                <td><button onclick="deletePlayer('${player.id}')" class="btn btn-danger">Delete</button></td>
            `;
        } else {
            // Public View (Full Data)
            tr.innerHTML = `
                <td style="font-weight: 500;">${player.first_name} ${player.last_name}</td>
                <td>${player.state_id}</td>
                <td>${player.fide_id || '-'}</td>
                <td>${player.fide_rating || 'Unrated'}</td>
                <td><span style="font-weight:bold; color:var(--text-muted)">${player.title || ''}</span></td>
            `;
        }
        tbody.appendChild(tr);
    });
}

// 3. Add New Player
async function addPlayer() {
    const newPlayer = {
        first_name: document.getElementById('first_name').value,
        last_name: document.getElementById('last_name').value,
        state_id: document.getElementById('state_id').value,
        fide_id: document.getElementById('fide_id').value,
        fide_rating: document.getElementById('fide_rating').value || null,
        title: document.getElementById('title').value
    };

    const { error } = await supabase.from('players').insert([newPlayer]);

    if (error) {
        alert('Error adding player: ' + error.message);
    } else {
        alert('Player added successfully!');
        document.getElementById('add-player-form').reset();
        fetchPlayers('admin-table-body', true); // Refresh table
    }
}

// 4. Delete Player
async function deletePlayer(id) {
    if(confirm("Are you sure you want to remove this player?")) {
        const { error } = await supabase.from('players').delete().eq('id', id);
        if (error) {
            alert('Error deleting player: ' + error.message);
        } else {
            fetchPlayers('admin-table-body', true); // Refresh table
        }
    }
}
