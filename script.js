// Address autocomplete for Albanian addresses
let addressTimeout;
function showAddressSuggestions() {
    clearTimeout(addressTimeout);
    addressTimeout = setTimeout(async () => {
        const input = document.getElementById("providerAddress");
        const suggestionsDiv = document.getElementById("addressSuggestions");
        const query = input.value.trim();
        if (query.length < 3) {
            suggestionsDiv.innerHTML = "";
            return;
        }
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=al&limit=5&q=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) {
                suggestionsDiv.innerHTML = "";
                return;
            }
            suggestionsDiv.innerHTML = `<div style='background:#fff;border:1px solid #ccc;border-radius:5px;position:absolute;z-index:10;width:100%;max-height:180px;overflow-y:auto;'>` +
                data.map(item => `<div style='padding:8px;cursor:pointer;' onmousedown=\"selectAddressSuggestion('${item.display_name.replace(/'/g, "&#39;")}')\">${item.display_name}</div>`).join('') +
                `</div>`;
        } catch (e) {
            suggestionsDiv.innerHTML = "";
        }
    }, 300);
}

function selectAddressSuggestion(address) {
    document.getElementById("providerAddress").value = address;
    document.getElementById("addressSuggestions").innerHTML = "";
}
// Load professions on page start
window.onload = loadProfessions;

async function loadProfessions() {
    const select = document.getElementById("professionSelect");
    select.innerHTML = "<option>Loading...</option>";

    try {
        const response = await fetch("https://heroiapitest20260317195904-h2brcdebadfuhvca.canadacentral-01.azurewebsites.net/Client/get-professions");
        const professions = await response.json();

        select.innerHTML = "<option value=''>Zgjidh Profesionin</option>";

        professions.forEach(p => {
            const option = document.createElement("option");
            option.value = p.id;
            option.textContent = p.professionName;
            select.appendChild(option);
        });
    } catch (error) {
        console.error(error);
        select.innerHTML = "<option>Gabim gjatë ngarkimit</option>";
    }
}

async function getCoordinates(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address + ", Albania")}`;

    try {
        const response = await fetch(url);

        if (!response.ok) return null;

        const data = await response.json();

        if (data.length === 0) return null;

        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
        };

    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
}

async function registerProvider() {
    const status = document.getElementById("status");

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    status.innerText = "Registering user...";

    const registerBody = {
        firstName: document.getElementById("firstName").value,
        lastName: document.getElementById("lastName").value,
        email: email,
        phone: document.getElementById("phone").value,
        password: password,
        address: document.getElementById("providerAddress").value,
        pfpUrl: "" //document.getElementById("pfpUrl").value
    };

    try {
        // STEP 1: Register
        const registerResponse = await fetch("https://heroiapitest20260317195904-h2brcdebadfuhvca.canadacentral-01.azurewebsites.net/Authentication/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registerBody)
        });

        if (!registerResponse.ok) {
            status.innerText = "Register failed";
            return;
        }

        status.innerText = "Registered. Logging in...";

        // STEP 2: Login
        const loginResponse = await fetch("https://heroiapitest20260317195904-h2brcdebadfuhvca.canadacentral-01.azurewebsites.net/Authentication/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        if (!loginResponse.ok) {
            status.innerText = "Login failed";
            return;
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;

        if (!token) {
            status.innerText = "No token received";
            return;
        }

        status.innerText = "Login successful. Getting coordinates...";

        // Selected profession
        const professionId = parseInt(document.getElementById("professionSelect").value);
        if (!professionId) {
            status.innerText = "Please select a profession";
            return;
        }

        const address = document.getElementById("providerAddress").value;

        if (!address) {
            status.innerText = "Please enter provider address";
            return;
        }

        // Get coordinates automatically
        const coords = await getCoordinates(address);

        if (!coords) {
            status.innerText = "Address not found. Try full address (e.g. Tirana)";
            return;
        }

        status.innerText = "Coordinates found. Creating provider...";

        const providerBody = {
            professionId: professionId,
            description: document.getElementById("description").value,
            address: address,
            lng: coords.lng,
            lat: coords.lat
        };

        // STEP 3: Become Provider (with JWT)
        const providerResponse = await fetch("https://heroiapitest20260317195904-h2brcdebadfuhvca.canadacentral-01.azurewebsites.net/Provider/become-provider", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(providerBody)
        });

        if (!providerResponse.ok) {
            status.innerText = "Provider creation failed";
            return;
        }

        status.innerText = "Success! User registered and became provider.";

    } catch (error) {
        console.error(error);
        status.innerText = "Error occurred";
    }
}
