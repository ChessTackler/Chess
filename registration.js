// ==========================================
// NEW PLAYER REGISTRATION & ID GENERATION LOGIC
// ==========================================

/**
 * Calculates and generates the next CDCA ID sequentially from Supabase
 * Format: CDCA/26-27/B/000x or CDCA/26-27/G/000x
 */
window.generateNextCDCAId = async function(genderStr) {
    // Determine the letter prefix (B for Boy, G for Girl)
    const prefix = genderStr === 'Boy' ? 'B' : 'G';
    const searchPrefix = `CDCA/26-27/${prefix}/`;

    // Query Supabase for all IDs starting with this exact prefix
    const { data, error } = await window.supabaseClient
        .from('player_database')
        .select('cdca_id')
        .ilike('cdca_id', `${searchPrefix}%`);

    // If database is completely empty or no matches exist, return 0001
    if (error || !data || data.length === 0) {
        return `${searchPrefix}0001`;
    }

    let maxSequence = 0;

    // Loop through all fetched IDs to find the absolute highest sequence number
    data.forEach(player => {
        const idString = player.cdca_id;
        const parts = idString.split('/');
        
        // Ensure format is correct: ["CDCA", "26-27", "B", "0001"]
        if (parts.length === 4) {
            const sequenceNumber = parseInt(parts[3], 10);
            if (!isNaN(sequenceNumber) && sequenceNumber > maxSequence) {
                maxSequence = sequenceNumber;
            }
        }
    });

    // Increment the max sequence and pad with zeros (e.g., 9 -> 0010)
    const nextSequence = maxSequence + 1;
    const paddedSequence = String(nextSequence).padStart(4, '0');
    
    return `${searchPrefix}${paddedSequence}`;
}

/**
 * Handles the Registration Form Submission
 */
window.submitRegistration = async function(event) {
    event.preventDefault();
    
    // Ensure app.js loaded Supabase correctly
    if (!window.supabaseClient) {
        window.uiAlert('System Error', 'Database connection offline. Please check your network and refresh.', true);
        return;
    }

    const btn = document.getElementById('reg-submit-btn');
    btn.innerHTML = '<div class="loader" style="width: 20px; height: 20px; border: 3px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; vertical-align: middle; margin-right: 10px; animation: spin 1s linear infinite;"></div> Processing...';
    btn.disabled = true;

    try {
        // 1. Gather Text Form Data
        const firstName = document.getElementById('reg_first_name').value.trim();
        const lastName = document.getElementById('reg_last_name').value.trim() || null;
        const gender = document.getElementById('reg_gender').value; 
        
        /* * Note for Future Backend Expansion: 
         * To save files (Photo, Aadhaar, Payment Proof) to Supabase Storage, 
         * you would execute storage.upload() here and grab the public URLs.
         * Example: const photoFile = document.getElementById('reg_photo').files[0];
         */

        // 2. Await Database ID Generation Algorithm
        const generatedId = await window.generateNextCDCAId(gender);

        // 3. Create entry payload for Supabase
        // Status defaults to "Pending" so it appears visually distinct in the Master Registry
        const newPlayerEntry = {
            first_name: firstName,
            last_name: lastName,
            cdca_id: generatedId,
            id_status: 'Pending', 
            
            /* * IMPORTANT: To save email and phone, your 'player_database' table in Supabase 
             * MUST have 'email' and 'phone' columns created first!
             * email: document.getElementById('reg_email').value,
             * phone: document.getElementById('reg_phone').value,
             */
        };

        // 4. Save to Database
        const { error } = await window.supabaseClient.from('player_database').insert([newPlayerEntry]);
        if (error) throw error;

        // 5. Success UI Display (Using global showModal from app.js)
        const successBodyHTML = `
            <div style="text-align: center; padding: 1rem 0;">
                <div style="font-size: 3.5rem; margin-bottom: 10px;">🎉</div>
                <h3 style="color: #10b981; margin-bottom: 1rem; font-size: 1.5rem;">Registration Successful!</h3>
                <p style="color: #475569; font-size: 1rem; margin-bottom: 1.5rem; line-height: 1.5;">Your credentials and payment proof have been received. The administration will review them shortly.</p>
                
                <div style="background: #f8fafc; padding: 1.5rem; border-radius: 12px; border: 2px dashed #cbd5e1; margin-bottom: 1rem;">
                    <span style="display: block; font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Your Official CDCA ID</span>
                    <strong style="font-size: 1.8rem; color: var(--primary-dark); font-family: monospace; letter-spacing: 1px;">${generatedId}</strong>
                </div>
                
                <p style="font-size: 0.85rem; color: #ef4444; font-weight: 600; background: #fee2e2; padding: 10px; border-radius: 6px;">⚠️ Save this ID. It is currently marked as 'Pending' in the master database until approved.</p>
            </div>
        `;
        
        window.showModal('Action Complete', successBodyHTML, `<button class="modal-btn modal-btn-confirm" style="width: 100%; font-size: 1.05rem;" onclick="window.location.href='players.html'">View Database</button>`);
        
        // Reset the visual form
        document.getElementById('public-registration-form').reset();

    } catch (err) {
        window.uiAlert('Registration Failed', err.message || 'An error occurred during submission. Please try again.', true);
    } finally {
        btn.innerHTML = 'Complete Registration';
        btn.disabled = false;
    }
}
