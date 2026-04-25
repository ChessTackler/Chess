// ==========================================
// REGISTRATION REVIEW PORTAL LOGIC
// ==========================================

window.allRegistrations = [];
window.filteredRegistrations = [];
window.regCurrentPage = 1;
window.regPageSize = 15;

document.addEventListener('DOMContentLoaded', async () => {
    const authMessage = document.getElementById('auth-message');
    const adminContent = document.getElementById('admin-content');
    const auth = await window.verifyAdminAccess();

    if (!auth.allowed) {
        authMessage.innerHTML = `<span style="color: #ef4444; font-size: 2.5rem;">♟️</span><br><br><span style="color:var(--text-dark); font-weight:800;">Access Denied.</span><br><span style="font-size:1rem; font-weight:400; display:block; margin-top:10px; color:var(--text-muted);">Admin privileges required.</span>`;
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    } else {
        authMessage.style.display = 'none';
        adminContent.style.display = 'block';
        window.fetchRegistrationData();
    }
});

window.fetchRegistrationData = async function() {
    if (!window.supabaseClient) return;
    const { data, error } = await window.supabaseClient
        .from('player_database')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        window.uiAlert('Database Error', error.message, true);
        return;
    }
    window.allRegistrations = data || [];
    window.filterRegistrations();
}

window.filterRegistrations = function() {
    const searchQuery = (document.getElementById('regSearchInput').value || "").toLowerCase().trim();
    const statusFilter = document.getElementById('statusFilter').value;

    window.filteredRegistrations = window.allRegistrations.filter(p => {
        if (statusFilter !== 'All' && p.id_status !== statusFilter) return false;
        const searchStr = `${p.first_name} ${p.last_name || ''} ${p.cdca_id} ${p.email || ''} ${p.phone || ''} ${p.utr_number || ''}`.toLowerCase();
        return searchStr.includes(searchQuery);
    });

    window.regCurrentPage = 1; 
    window.renderRegistrationTable();
}

window.renderRegistrationTable = function() {
    const tbody = document.getElementById('registration-tbody');
    if (!tbody) return;

    const totalPages = Math.ceil(window.filteredRegistrations.length / window.regPageSize) || 1;
    if (window.regCurrentPage > totalPages) window.regCurrentPage = totalPages;
    
    const start = (window.regCurrentPage - 1) * window.regPageSize;
    const paginated = window.filteredRegistrations.slice(start, start + window.regPageSize);

    tbody.innerHTML = ''; 

    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 3rem;">No registration data found matching your criteria.</td></tr>`;
    } else {
        paginated.forEach(player => {
            const tr = document.createElement('tr');
            
            const dateStr = player.created_at ? new Date(player.created_at).toLocaleDateString() : 'N/A';
            const fullName = window.escapeHTML(`${player.first_name} ${player.last_name || ''}`.trim());
            const displayId = `<strong style="color: var(--primary-dark); font-family: monospace;">${window.escapeHTML(player.cdca_id)}</strong>`;
            const displayContact = `<div style="font-size:0.85rem; color:#475569;">${window.escapeHTML(player.email || 'No email')}<br>${window.escapeHTML(player.phone || 'No phone')}</div>`;
            const displayUtr = player.utr_number ? window.escapeHTML(player.utr_number) : '<span style="color:#94a3b8; font-style:italic;">Not provided</span>';
            const displayStatus = window.formatStatusBadge(player.id_status);

            if(player.id_status === 'Pending') { tr.style.backgroundColor = '#fffbeb'; }

            tr.innerHTML = `
                <td style="font-size:0.9rem;">${dateStr}</td>
                <td>${displayId}</td>
                <td style="font-weight:600;">${fullName}</td>
                <td>${displayContact}</td>
                <td style="font-family: monospace;">${displayUtr}</td>
                <td>${displayStatus}</td>
                <td style="text-align: right;">
                    <button onclick="window.openReviewModal('${player.id}')" class="action-btn promote" style="background:var(--primary-blue); color:white; border:none;">Review & Verify</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('reg-page-info').innerText = `Page ${window.regCurrentPage} of ${totalPages} (${window.filteredRegistrations.length} Total Entries)`;
    document.getElementById('reg-page-prev').disabled = (window.regCurrentPage === 1);
    document.getElementById('reg-page-next').disabled = (window.regCurrentPage === totalPages);
}

window.openReviewModal = function(id) {
    const player = window.allRegistrations.find(p => p.id === id);
    if (!player) return;

    const photoUrl = player.photo_url || '';
    const aadhaarUrl = player.aadhaar_url || '';
    const paymentUrl = player.payment_proof_url || '';
    
    // A clean document icon fallback for PDFs or broken images
    const fallbackImg = 'https://via.placeholder.com/150x150/f8fafc/94a3b8?text=📄+Document';

    const bodyHTML = `
        <div style="max-height: 70vh; overflow-y: auto; padding-right: 10px;">
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; text-align: center;">
                <span style="font-size: 0.85rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Generated ID</span>
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary-dark); font-family: monospace;">${window.escapeHTML(player.cdca_id)}</div>
            </div>

            <h4 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">Player Details</h4>
            <div style="margin-bottom: 1.5rem;">
                <div class="detail-row"><span class="detail-label">Full Name</span> <span class="detail-value">${window.escapeHTML(player.first_name)} ${window.escapeHTML(player.last_name || '')}</span></div>
                <div class="detail-row"><span class="detail-label">Gender</span> <span class="detail-value">${window.escapeHTML(player.gender || 'N/A')}</span></div>
                <div class="detail-row"><span class="detail-label">Date of Birth</span> <span class="detail-value">${window.escapeHTML(player.dob || 'N/A')}</span></div>
                <div class="detail-row"><span class="detail-label">Email</span> <span class="detail-value">${window.escapeHTML(player.email || 'N/A')}</span></div>
                <div class="detail-row"><span class="detail-label">Phone</span> <span class="detail-value">${window.escapeHTML(player.phone || 'N/A')}</span></div>
                <div class="detail-row"><span class="detail-label">UTR Number</span> <span class="detail-value" style="font-family: monospace;">${window.escapeHTML(player.utr_number || 'N/A')}</span></div>
            </div>

            <h4 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">Uploaded Documents</h4>
            <div class="document-grid">
                <div class="doc-card">
                    <img src="${photoUrl}" alt="Photo" onerror="this.src='${fallbackImg}'">
                    <a href="${photoUrl}" target="_blank">${photoUrl ? 'Open Photo ↗' : 'No File'}</a>
                </div>
                <div class="doc-card">
                    <img src="${aadhaarUrl}" alt="Aadhaar" onerror="this.src='${fallbackImg}'">
                    <a href="${aadhaarUrl}" target="_blank">${aadhaarUrl ? 'Open Aadhaar ↗' : 'No File'}</a>
                </div>
                <div class="doc-card">
                    <img src="${paymentUrl}" alt="Payment Proof" onerror="this.src='${fallbackImg}'">
                    <a href="${paymentUrl}" target="_blank">${paymentUrl ? 'Open Proof ↗' : 'No File'}</a>
                </div>
            </div>
        </div>
    `;

    let footerHTML = `<button class="modal-btn modal-btn-cancel" onclick="window.closeModal()">Close</button>`;
    
    if (player.id_status === 'Pending') {
        footerHTML += `
            <button class="modal-btn modal-btn-danger" onclick="window.deleteRegistration('${player.id}')">Reject & Delete</button>
            <button class="modal-btn modal-btn-confirm" onclick="window.approveRegistration('${player.id}')" style="background: #10b981;">Approve & Activate ID</button>
        `;
    } else {
        footerHTML += `<button class="modal-btn modal-btn-confirm" disabled style="background: #cbd5e1; cursor: not-allowed;">Already Active</button>`;
    }

    window.showModal('📋 Application Review', bodyHTML, footerHTML);
}

window.approveRegistration = async function(id) {
    if (!window.supabaseClient) return;
    
    window.uiConfirm('Approve Registration?', 'This will change the ID status to Active, allowing it to appear normally in the public database.', 'Activate', async () => {
        const { error } = await window.supabaseClient
            .from('player_database')
            .update({ id_status: 'Active' })
            .eq('id', id);
            
        if (error) {
            window.uiAlert('Failed', error.message, true);
        } else {
            window.uiAlert('Success', 'Player ID has been activated!');
            window.fetchRegistrationData(); 
        }
    });
}

window.deleteRegistration = async function(id) {
    if (!window.supabaseClient) return;
    
    window.uiConfirm('Reject & Delete?', 'Are you sure you want to completely reject and delete this registration? This cannot be undone.', 'Delete Application', async () => {
        const { error } = await window.supabaseClient
            .from('player_database')
            .delete()
            .eq('id', id);
            
        if (error) {
            window.uiAlert('Failed', error.message, true);
        } else {
            window.uiAlert('Deleted', 'Application has been removed.');
            window.fetchRegistrationData(); 
        }
    });
}
