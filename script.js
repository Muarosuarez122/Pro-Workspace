import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyArg2GNhsnlK7-JW0w-8D4tb46V2vAgZbQ",
  authDomain: "stee-53dc1.firebaseapp.com",
  databaseURL: "https://stee-53dc1-default-rtdb.firebaseio.com",
  projectId: "stee-53dc1",
  storageBucket: "stee-53dc1.firebasestorage.app",
  messagingSenderId: "737719774829",
  appId: "1:737719774829:web:7cabfa294cae4d6d861964",
  measurementId: "G-ZV3L9Z34VE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let currentFbUser = null;

async function savePremiumToFirebase() {
    if (currentFbUser && currentUser) {
        try {
            await set(ref(db, 'users/' + currentFbUser.uid), {
                isContractPro: currentUser.isContractPro,
                isManagerPro: currentUser.isManagerPro,
                isBundle: currentUser.isBundle
            });
        } catch (e) {
            console.error("Error saving to Realtime Database:", e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {

    const authView = document.getElementById('authView');
    const appView = document.getElementById('appView');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authError = document.getElementById('authError');
    
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('authEmail').value.trim();
        const pass = document.getElementById('authPassword').value.trim();
        
        if (!email || !pass) {
            authError.textContent = 'Completa ambos campos.';
            authError.style.display = 'block';
            return;
        }

        loginBtn.textContent = 'Procesando...';
        authError.style.display = 'none';

        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            if (error.code.includes('invalid-credential') || error.code.includes('user-not-found') || error.code.includes('wrong-password')) {
                try {
                    await createUserWithEmailAndPassword(auth, email, pass);
                } catch (err2) {
                    if (err2.code === 'auth/email-already-in-use') {
                        authError.textContent = 'Contraseña incorrecta. El usuario ya existe.';
                    } else if (err2.code === 'auth/weak-password') {
                        authError.textContent = 'La contraseña es muy débil (mínimo 6 caracteres).';
                    } else {
                        authError.textContent = 'Error: ' + err2.message;
                    }
                    authError.style.display = 'block';
                    loginBtn.textContent = 'Entrar / Registrarse';
                }
            } else {
                authError.textContent = 'Error: ' + error.message;
                authError.style.display = 'block';
                loginBtn.textContent = 'Entrar / Registrarse';
            }
        }
    });
    
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            location.reload();
        });
    });

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentFbUser = user;
            
            currentUser = {
                email: user.email,
                isContractPro: false,
                isManagerPro: false,
                isBundle: false
            };

            const isAdmin = user.email.toLowerCase() === 'admin' || user.email.toLowerCase() === 'admin@admin.com';

            try {
                const snapshot = await get(child(ref(db), `users/${user.uid}`));
                if (snapshot.exists()) {
                    const dbData = snapshot.val();
                    currentUser.isContractPro = dbData.isContractPro || false;
                    currentUser.isManagerPro = dbData.isManagerPro || false;
                    currentUser.isBundle = dbData.isBundle || false;
                }
            } catch(e) {
                console.warn("Realtime DB block or new user:", e);
            }

            if (isAdmin) {
                currentUser.isContractPro = true;
                currentUser.isManagerPro = true;
                currentUser.isBundle = true;
            }

            showApp();
        } else {
            currentUser = null;
            currentFbUser = null;
            appView.style.display = 'none';
            authView.style.display = 'flex';
            loginBtn.textContent = 'Entrar / Registrarse';
        }
    });

    function showApp() {
        authView.style.display = 'none';
        appView.style.display = 'block';
        document.getElementById('userEmailDisplay').textContent = currentUser.email;

        const planDisplay = document.getElementById('userPlanDisplay');
        const mainPayBtn = document.getElementById('mainPayBtn');
        
        if (currentUser.isBundle || (currentUser.isContractPro && currentUser.isManagerPro)) {
            planDisplay.textContent = '💎 BUNDLE PRO';
            planDisplay.style.color = '#8b5cf6';
            mainPayBtn.style.display = 'none';
        } else if (currentUser.isContractPro) {
            planDisplay.textContent = '⚡ PRO CONTRACT';
            planDisplay.style.color = '#10b981';
            mainPayBtn.textContent = 'COMPLETAR EL ECOSISTEMA';
        } else if (currentUser.isManagerPro) {
            planDisplay.textContent = '⚡ PRO MANAGER';
            planDisplay.style.color = '#3b82f6';
            mainPayBtn.textContent = 'COMPLETAR EL ECOSISTEMA';
        } else {
            planDisplay.textContent = '⚪ PLAN GRATUITO';
            planDisplay.style.color = '#94a3b8';
            mainPayBtn.textContent = 'OBTENER LA LICENCIA PRO';
        }
    }

    // --- CHECKOUT & PAYPAL ---
    const checkoutModal = document.getElementById('checkoutModal');
    const pricingCards = document.querySelectorAll('.pricing-card');
    let selectedAmount = '4.00';
    let selectedPlan = 'bundle';

    document.getElementById('mainPayBtn').addEventListener('click', () => {
        checkoutModal.classList.add('active');
    });
    
    document.getElementById('closeModal').addEventListener('click', () => {
        checkoutModal.classList.remove('active');
    });

    pricingCards.forEach(card => {
        card.addEventListener('click', () => {
            pricingCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedAmount = card.dataset.price;
            selectedPlan = card.dataset.plan;
        });
    });

    if (window.paypal) {
        window.paypal.Buttons({
            style: { layout: 'vertical', color: 'gold', shape: 'rect' },
            createOrder: function(data, actions) {
                return actions.order.create({
                    purchase_units: [{
                        amount: { value: selectedAmount, currency_code: 'USD' },
                        description: `Adquisición de Plan: ${selectedPlan}`
                    }]
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(async function(details) {
                    checkoutModal.classList.remove('active');
                    
                    if (selectedPlan === 'bundle') {
                        currentUser.isBundle = true;
                        currentUser.isContractPro = true;
                        currentUser.isManagerPro = true;
                    } else if (selectedPlan === 'contract') {
                        currentUser.isContractPro = true;
                    } else if (selectedPlan === 'manager') {
                        currentUser.isManagerPro = true;
                    }

                    await savePremiumToFirebase();
                    showApp(); 
                    alert('¡Pago exitoso! Accede a cualquiera de las apps para disfrutar de tus funciones.');
                });
            }
        }).render('#paypal-button-container');
    }

});
