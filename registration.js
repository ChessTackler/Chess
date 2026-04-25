// ==========================================
// NEW PLAYER REGISTRATION & UPLOAD LOGIC
// ==========================================

window.generateNextCDCAId = async function(genderStr) {
    const prefix = genderStr === 'Boy' ? 'B' : 'G';
    const searchPrefix = `CDCA/26-27/${prefix}/`;

    // Search the master database for any existing IDs with this prefix
    const { data, error } = await window.supabaseClient
        .from('player_database')
        .select('cdca_id')
        .ilike('cdca_id', `${searchPrefix}%`);

    if (error || !data || data.length === 0) {
        return `${searchPrefix}0001`;
    }

    let maxSequence = 0;
    data.forEach(player => {
        const idString = player.cdca_id;
        const parts = idString.split('/');
        if (parts.length === 4) {
            const sequenceNumber = parseInt(parts[3], 10);
            if (!isNaN(sequenceNumber) && sequenceNumber > maxSequence) {
                maxSequence = sequenceNumber;
            }
        }
    });

    const nextSequence = maxSequence + 1;
    const paddedSequence = String(nextSequence).padStart(4, '0');
    return `${searchPrefix}${paddedSequence}`;
}

async function uploadToSupabaseStorage(file, folderPath) {
    if (!file) return null;
    
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const fullPath = `${folderPath}/${uniqueFileName}`;

    const { data, error } = await window.supabaseClient.storage
        .from('player_documents') 
        .upload(fullPath, file, { cacheControl: '3600', upsert: false });

    if (error) {
        console.error("Storage Upload Error:", error);
        throw new Error(`Failed to upload file. Ensure the 'player_documents' bucket exists and is Public.`);
    }

    const { data: publicUrlData } = window.supabaseClient.storage
        .from('player_documents')
        .getPublicUrl(fullPath);

    return publicUrlData.publicUrl;
}

window.submitRegistration = async function(event) {
    event.preventDefault();
    
    if (!window.supabaseClient) {
        window.uiAlert('System Error', 'Database connection offline. Please check your network and refresh.', true);
        return;
    }

    const btn = document.getElementById('reg-submit-btn');
    btn.innerHTML = '<div class="loader" style="width: 20px; height: 20px; border: 3px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; vertical-align: middle; margin-right: 10px; animation: spin 1s linear infinite;"></div> Uploading Files & Processing...';
    btn.disabled = true;

    try {
        const firstName = document.getElementById('reg_first_name').value.trim();
        const lastName = document.getElementById('reg_last_name').value.trim() || null;
        const gender = document.getElementById('reg_gender').value; 
        const dob = document.getElementById('reg_dob').value;
        const email = document.getElementById('reg_email').value.trim();
        const phone = document.getElementById('reg_phone').value.trim();
        const utrNumber = document.getElementById('reg_utr').value.trim();

        const photoFile = document.getElementById('reg_photo').files[0];
        const aadhaarFile = document.getElementById('reg_aadhaar').files[0];
        const paymentFile = document.getElementById('reg_payment_proof').files[0];

        if(!photoFile || !aadhaarFile || !paymentFile) {
             throw new Error("All verification documents and payment proof must be uploaded.");
        }

        // Upload securely to Supabase
        const photoUrl = await uploadToSupabaseStorage(photoFile, 'photos');
        const aadhaarUrl = await uploadToSupabaseStorage(aadhaarFile, 'aadhaar_cards');
        const paymentUrl = await uploadToSupabaseStorage(paymentFile, 'payment_proofs');

        // Generate ID
        const generatedId = await window.generateNextCDCAId(gender);

        const newPlayerEntry = {
            first_name: firstName,
            last_name: lastName,
            cdca_id: generatedId,
            id_status: 'Pending', 
            gender: gender,
            dob: dob,
            email: email,
            phone: phone,
            utr_number: utrNumber,
            photo_url: photoUrl,         
            aadhaar_url: aadhaarUrl,     
            payment_proof_url: paymentUrl 
        };

        const { error } = await window.supabaseClient.from('player_database').insert([newPlayerEntry]);
        if (error) throw error;

        const successBodyHTML = `
            <div style="text-align: center; padding: 1rem 0;">
                <div style="font-size: 3.5rem; margin-bottom: 10px;">🎉</div>
                <h3 style="color: #10b981; margin-bottom: 1rem; font-size: 1.5rem;">Registration Successful!</h3>
                <p style="color: #475569; font-size: 1rem; margin-bottom: 1.5rem; line-height: 1.5;">Your documents and payment proof have been securely uploaded.</p>
                <div style="background: #f8fafc; padding: 1.5rem; border-radius: 12px; border: 2px dashed #cbd5e1; margin-bottom: 1rem;">
                    <span style="display: block; font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem; font-weight: 700; text-transform: uppercase;">Your Official CDCA ID</span>
                    <strong style="font-size: 1.8rem; color: var(--primary-dark); font-family: monospace; letter-spacing: 1px;">${generatedId}</strong>
                </div>
                <p style="font-size: 0.85rem; color: #ef4444; font-weight: 600; background: #fee2e2; padding: 10px; border-radius: 6px;">⚠️ Save this ID. It is marked as 'Pending' until reviewed.</p>
            </div>
        `;
        window.showModal('Action Complete', successBodyHTML, `<button class="modal-btn modal-btn-confirm" style="width: 100%; font-size: 1.05rem;" onclick="window.location.href='players.html'">View Database</button>`);
        document.getElementById('public-registration-form').reset();

    } catch (err) {
        window.uiAlert('Registration Failed', err.message || 'An error occurred during submission. Please try again.', true);
    } finally {
        btn.innerHTML = 'Complete Registration';
        btn.disabled = false;
    }
}
