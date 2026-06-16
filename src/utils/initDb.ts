import { doc, getDoc, setDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

export async function initGlobalSettings() {
  const settingsDocRef = doc(db, 'settings', 'global');
  try {
    const docSnap = await getDoc(settingsDocRef);
    if (!docSnap.exists()) {
      console.log('Initializing global settings...');
      await setDoc(settingsDocRef, {
        appName: 'Xô Fome',
        monthlyFee: 50,
        minWalletBalance: 5,
        minRechargeAmount: 20,
        orderDeductionAmount: 2,
        autoMonthlyBilling: false,
        splitPayEnabled: false,
        maintenanceMode: false,
        maintenanceMessage: 'Estamos realizando melhorias no sistema. Voltaremos em breve!',
        globalTheme: {
          primaryColor: '#e11d48',
          secondaryColor: '#be123c',
          isGradient: true
        },
        clientIcons: {
          size: 24,
          spacing: 12,
          colorIcon: '#3b82f6',
          filterIcon: '#3b82f6',
          ordersIcon: '#3b82f6',
          cartIcon: '#3b82f6'
        },
        defaultOrderSoundUrl: 'https://assets.mixkit.co/active_storage/sfx/2510/2510-preview.mp3',
        _systemKey: 'backend_service_key_2024_tupa'
      });
      console.log('Global settings initialized.');
    }

    // Ensure standard categories exist (Bebidas, Açaís, Padaria, Hambúrguer, Pizza)
    const categoriesCol = collection(db, 'categories');
    const categoriesSnap = await getDocs(categoriesCol);
    
    const requiredCategories = [
      { name: 'Pizza', iconName: 'Pizza' },
      { name: 'Bebidas', iconName: 'CupSoda' },
      { name: 'Açaís', iconName: 'Zap' },
      { name: 'Padaria', iconName: 'Store' },
      { name: 'Hambúrguer', iconName: 'Utensils' }
    ];

    const existingNames = categoriesSnap.docs.map(doc => {
      const data = doc.data();
      return (data.name || '').trim().toLowerCase();
    });

    let orderCounter = categoriesSnap.size + 1;

    for (const reqCat of requiredCategories) {
      if (!existingNames.includes(reqCat.name.toLowerCase())) {
        console.log(`Adding missing category: ${reqCat.name}`);
        const catRef = doc(collection(db, 'categories'));
        await setDoc(catRef, {
          name: reqCat.name,
          iconName: reqCat.iconName,
          active: true,
          status: 'active',
          order: orderCounter++,
          imageUrl: '',
          id: catRef.id,
          _systemKey: 'backend_service_key_2024_tupa'
        });
      }
    }
    console.log('Ensure standard categories logic completed successfully.');

    // Initialize business categories if empty
    const busCatsCol = collection(db, 'business_categories');
    const busCatsSnap = await getDocs(busCatsCol);
    if (busCatsSnap.empty) {
      console.log('Initializing business categories...');
      const initialBusCats = [
        { name: 'Restaurantes', imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80', status: 'active', order: 1 },
        { name: 'Mercados', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80', status: 'active', order: 2 },
        { name: 'Farmácias', imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?auto=format&fit=crop&q=80', status: 'active', order: 3 },
        { name: 'Bebidas', imageUrl: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&q=80', status: 'active', order: 4 },
        { name: 'Pet Shops', imageUrl: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80', status: 'active', order: 5 }
      ];
      for (const cat of initialBusCats) {
        const catRef = doc(collection(db, 'business_categories'));
        await setDoc(catRef, {
          ...cat,
          id: catRef.id,
          _systemKey: 'backend_service_key_2024_tupa'
        });
      }
      console.log('Business categories initialized.');
    }

    // Initialize cities if empty
    const citiesCol = collection(db, 'cities');
    const citiesSnap = await getDocs(citiesCol);
    if (citiesSnap.empty) {
      console.log('Initializing cities with Juruti template...');
      const initialCities = [
        { 
          name: 'Juruti', 
          apiUrl: 'https://meupaineldegestao.com.br',
          apiKey: 'mch_api_102PEeeeYfz07k2RQFpD21LE',
          authEmail: 'tupamobilidadeurbana@gmail.com',
          authPassword: '@Ehbc7890',
          lat: -2.1571381,
          lng: -56.0900977,
          active: true, 
          status: 'online',
          integrationActive: true,
          categories: []
        },
        { 
          name: 'Porto Velho', 
          lat: -8.7618,
          lng: -63.9039,
          active: true, 
          status: 'online',
          integrationActive: false,
          categories: []
        }
      ];
      for (const city of initialCities) {
        const cityRef = doc(collection(db, 'cities'));
        await setDoc(cityRef, {
          ...city,
          id: cityRef.id,
          _systemKey: 'backend_service_key_2024_tupa'
        });
      }
      console.log('Cities initialized with Juruti.');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/global');
  }
}
