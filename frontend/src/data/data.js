function getRandomDate(start, end) {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toLocaleString();
}

export const productsData = [
  {
    id: 1,
    name: "Paracetamol Tablets",
    category: "Pain Relief",
    expiryDate: "2025-08-15",
    price: 50.99,
    quantity: 8,
    shelfNumber: "Shelf A",
    image: "https://5.imimg.com/data5/SELLER/Default/2022/9/IV/UY/CG/75459511/500mg-paracetamol-tablet.jpg", 
    description: "Effective pain relief for headaches, fever, and mild aches."
  },
  {
    id: 2,
    name: "Cough Syrup",
    category: "Cough & Cold",
    expiryDate: "2024-11-30",
    price: 170.50,
    quantity: 200,
    shelfNumber: "Shelf B",
    image: "https://images.apollo247.in/pub/media/catalog/product/a/l/alk0008.jpg?tr=w-400,q-100,f-webp,c-at_max",
    description: "Soothing syrup for relief from cough and throat irritation."
  },
  {
    id: 3,
    name: "Vitamin D Supplements",
    category: "Vitamins & Supplements",
    expiryDate: "2026-03-10",
    price: 120.99,
    quantity: 120,
    shelfNumber: "Shelf C",
    image: "https://m.media-amazon.com/images/I/61-4q3mEt+L.jpg",
    description: "Vitamin D supplements for bone Smart and immune support."
  },
  {
    id: 4,
    name: "Antacid Tablets",
    category: "Digestive Smart",
    expiryDate: "2027-01-01",
    price: 60.99,
    quantity: 500,
    shelfNumber: "Shelf D",
    image: "https://images-cdn.ubuy.co.in/64c1fcd40d532810824d07bd-equate-ultra-strength-antacid-tablets.jpg",
    description: "Relieves heartburn and indigestion."
  },
  {
    id: 5,
    name: "Ibuprofen",
    category: "Pain Relief",
    expiryDate: "2026-07-21",
    price: 90.99,
    quantity: 75,
    shelfNumber: "Shelf E",
    image: "https://5.imimg.com/data5/SELLER/Default/2023/6/319597573/MH/NE/SR/135658020/ibuprofen-400-mg-bp-tablets.jpg",
    description: "Pain relief for inflammation and mild to moderate pain."
  },
  {
    id: 6,
    name: "Multivitamin Capsules",
    category: "Vitamins & Supplements",
    expiryDate: "2025-12-31",
    price: 150.99,
    quantity: 300,
    shelfNumber: "Shelf A",
    image: "https://5.imimg.com/data5/SELLER/Default/2022/12/GO/RT/KE/40092401/multivitamin-multimineral-capsule.jpg",
    description: "Daily multivitamin supplement for overall Smart."
  },
  {
    id: 7,
    name: "Allergy Relief Tablets",
    category: "Allergy & Immunity",
    expiryDate: "2026-05-01",
    price: 80.99,
    quantity: 200,
    shelfNumber: "Shelf B",
    image: "https://images-cdn.ubuy.co.in/63930c2757343c79802716b2-equate-allergy-relief-tablets-with.jpg",
    description: "Relieves symptoms of allergies like sneezing and runny nose."
  },
  {
    id: 8,
    name: "Antibiotic Ointment",
    category: "First Aid",
    expiryDate: "2027-09-14",
    price: 125.50,
    quantity: 0,
    shelfNumber: "Shelf C",
    image: "https://images-cdn.ubuy.co.in/633aa06331538537443d82de-neosporin-antibiotic-original-ointment.jpg",
    description: "Topical ointment to prevent infection in minor cuts and burns."
  },
  {
    id: 9,
    name: "Calcium Tablets",
    category: "Vitamins & Supplements",
    expiryDate: "2028-02-28",
    price: 140.00,
    quantity: 100,
    shelfNumber: "Shelf D",
    image: "https://images.apollo247.in/pub/media/catalog/product/C/O/COR0649_1_1.jpg",
    description: "Supports bone Smart with essential calcium."
  },
  {
    id: 10,
    name: "Cough Lozenges",
    category: "Cough & Cold",
    expiryDate: "2026-12-25",
    price: 300.50,
    quantity: 0,
    shelfNumber: "Shelf E",
    image: "https://5.imimg.com/data5/SELLER/Default/2023/8/336260684/MC/CH/XE/39191657/cofsils-cough-lozenges.jpeg",
    description: "Relieves throat irritation and cough."
  },
  {
    id: 11,
    name: "Cold and Flu Capsules",
    category: "Cough & Cold",
    expiryDate: "2025-11-30",
    price: 80.99,
    quantity: 300,
    shelfNumber: "Shelf A",
    image: "https://images-cdn.ubuy.co.in/63930c2757343c79802716b2-equate-allergy-relief-tablets-with.jpg",
    description: "Relieves symptoms of cold and flu like aches and fever."
  },
  {
    id: 12,
    name: "Anti-Fungal Cream",
    category: "Skin Care",
    expiryDate: "2027-10-01",
    price: 100.99,
    quantity: 150,
    shelfNumber: "Shelf B",
    image: "https://cdn01.pharmeasy.in/dam/products_otc/O99342/canesten-cream-30gm-2-1670499083.jpg",
    description: "Effective treatment for fungal infections of the skin."
  },
  {
    id: 13,
    name: "Antihistamine Tablets",
    category: "Allergy & Immunity",
    expiryDate: "2026-05-15",
    price: 50.50,
    quantity: 50,
    shelfNumber: "Shelf C",
    image: "https://5.imimg.com/data5/SELLER/Default/2022/12/OS/NU/EO/48174519/antihistamines-and-antiallergic-tablets.JPG",
    description: "Provides relief from allergic reactions like hives and itching."
  },
  {
    id: 14,
    name: "Nasal Decongestant Spray",
    category: "Cough & Cold",
    expiryDate: "2028-04-20",
    price: 70.99,
    quantity: 20,
    shelfNumber: "Shelf D",
    image: "https://i-cf65.ch-static.com/content/dam/cf-consumer-Smartcare/otrivin-v3/en_IN/products/Otrivin%20Oxy.png?auto=format",
    description: "Clears nasal congestion due to colds or allergies."
  },
  {
    id: 15,
    name: "Laxative Tablets",
    category: "Digestive Smart",
    expiryDate: "2029-03-01",
    price: 60.50,
    quantity: 9,
    shelfNumber: "Shelf E",
    image: "https://cdn01.pharmeasy.in/dam/products_otc/247965/dulcoflex-5mg-tablet-constipation-laxative-bowel-movement-regulator-1-strip-10-tablet-3-1671740767.jpg",
    description: "Relieves constipation and promotes bowel movement."
  },
  {
    id: 16,
    name: "Detol",
    category: "First Aid",
    expiryDate: "2025-12-31",
    price: 89.50,
    quantity: 500,
    shelfNumber: "Shelf A",
    image: "https://www.netmeds.com/images/product-v1/600x600/15114/dettol_antiseptic_liquid_60_ml_0_2.jpg",
    description: "Disinfects wounds and prevents infections."
  },
  {
    id: 17,
    name: "Cough Suppressant",
    category: "Cough & Cold",
    expiryDate: "2026-06-30",
    price: 90.50,
    quantity: 3,
    shelfNumber: "Shelf B",
    image: "https://5.imimg.com/data5/SELLER/Default/2022/3/KJ/IU/CU/4262908/dextromethorphan-hydrobromide-chlorpheniramine-maleate-syrup.png",
    description: "Relieves persistent cough and throat irritation."
  },
  {
    id: 18,
    name: "Eye Drops",
    category: "Eye Care",
    expiryDate: "2024-10-15",
    price: 150.25,
    quantity: 10,
    shelfNumber: "Shelf C",
    image: "https://himalayawellness.in/cdn/shop/products/OPHTHACARE-DROPS-10ML.jpg?v=1659002377",
    description: "Soothes dry and irritated eyes."
  },
  {
    id: 19,
    name: "Tear Drop",
    category: "Eye Care",
    expiryDate: "2024-10-15",
    price: 90.25,
    quantity: 10,
    shelfNumber: "Shelf C",
    image: "https://himalayawellness.in/cdn/shop/products/OPHTHACARE-DROPS-10ML.jpg?v=1659002377",
    description: "Soothes dry and irritated eyes."
  },
  {
    id: 20,
    name: "Miatro",
    category: "Eye Care",
    expiryDate: "2024-10-15",
    price: 125.25,
    quantity: 100,
    shelfNumber: "Shelf C",
    image: "https://himalayawellness.in/cdn/shop/products/OPHTHACARE-DROPS-10ML.jpg?v=1659002377",
    description: "Soothes dry and irritated eyes."
  }
];


export const ordersData = [
  {
    id: 1,
    customerName: "Alice Johnson",
    customerPhoneNumber: "9876543210",
    customerAddress: "123 Main St, Springfield",
    products: [
      {
        product: productsData[0].name, // Organic Honey
        rate: productsData[0].price,
        quantity: 2,
        totalPrice: productsData[0].price * 2
      },
      {
        product: productsData[1].name, // Wireless Headphones
        rate: productsData[1].price,
        quantity: 1,
        totalPrice: productsData[1].price * 1
      }
    ],
    overallTotalPrice: productsData[0].price * 2 + productsData[1].price * 1,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "paid"
  },
  {
    id: 2,
    customerName: "Bob Smith",
    customerPhoneNumber: "8765432109",
    customerAddress: "456 Oak Ave, Shelbyville",
    products: [
      {
        product: productsData[2].name, // Vitamin C Serum
        rate: productsData[2].price,
        quantity: 3,
        totalPrice: productsData[2].price * 3
      }
    ],
    overallTotalPrice: productsData[2].price * 3,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "unpaid"
  },
  {
    id: 3,
    customerName: "Charlie Davis",
    customerPhoneNumber: "7654321098",
    customerAddress: "789 Maple Rd, Ogdenville",
    products: [
      {
        product: productsData[3].name, // Eco-friendly Notebook
        rate: productsData[3].price,
        quantity: 5,
        totalPrice: productsData[3].price * 5
      },
      {
        product: productsData[4].name, // LED Desk Lamp
        rate: productsData[4].price,
        quantity: 1,
        totalPrice: productsData[4].price * 1
      }
    ],
    overallTotalPrice: productsData[3].price * 5 + productsData[4].price * 1,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "paid"
  },
  {
    id: 4,
    customerName: "Daisy Evans",
    customerPhoneNumber: "6543210987",
    customerAddress: "101 Pine St, Capital City",
    products: [
      {
        product: productsData[5].name, // Green Tea
        rate: productsData[5].price,
        quantity: 10,
        totalPrice: productsData[5].price * 10
      }
    ],
    overallTotalPrice: productsData[5].price * 10,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "paid"
  },
  {
    id: 5,
    customerName: "Evan Wright",
    customerPhoneNumber: "5432109876",
    customerAddress: "202 Birch Ln, North Haverbrook",
    products: [
      {
        product: productsData[6].name, // Smart Thermostat
        rate: productsData[6].price,
        quantity: 1,
        totalPrice: productsData[6].price * 1
      },
      {
        product: productsData[7].name, // Yoga Mat
        rate: productsData[7].price,
        quantity: 2,
        totalPrice: productsData[7].price * 2
      }
    ],
    overallTotalPrice: productsData[6].price * 1 + productsData[7].price * 2,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "unpaid"
  },
  {
    id: 6,
    customerName: "Frankie Harris",
    customerPhoneNumber: "4321098765",
    customerAddress: "303 Elm St, Brockway",
    products: [
      {
        product: productsData[8].name, // Bluetooth Speaker
        rate: productsData[8].price,
        quantity: 4,
        totalPrice: productsData[8].price * 4
      }
    ],
    overallTotalPrice: productsData[8].price * 4,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "paid"
  },
  {
    id: 7,
    customerName: "Grace Foster",
    customerPhoneNumber: "3210987654",
    customerAddress: "404 Cedar Dr, Ogdenville",
    products: [
      {
        product: productsData[9].name, // Ceramic Coffee Mug
        rate: productsData[9].price,
        quantity: 6,
        totalPrice: productsData[9].price * 6
      }
    ],
    overallTotalPrice: productsData[9].price * 6,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "unpaid"
  },
  {
    id: 8,
    customerName: "Hank Lewis",
    customerPhoneNumber: "2109876543",
    customerAddress: "505 Spruce St, Springfield",
    products: [
      {
        product: productsData[0].name, // Organic Honey
        rate: productsData[0].price,
        quantity: 4,
        totalPrice: productsData[0].price * 4
      },
      {
        product: productsData[1].name, // Wireless Headphones
        rate: productsData[1].price,
        quantity: 1,
        totalPrice: productsData[1].price * 1
      }
    ],
    overallTotalPrice: productsData[0].price * 4 + productsData[1].price * 1,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "paid"
  },
  {
    id: 9,
    customerName: "Ivy Bennett",
    customerPhoneNumber: "1098765432",
    customerAddress: "606 Willow Ln, North Haverbrook",
    products: [
      {
        product: productsData[2].name, // Vitamin C Serum
        rate: productsData[2].price,
        quantity: 2,
        totalPrice: productsData[2].price * 2
      }
    ],
    overallTotalPrice: productsData[2].price * 2,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "unpaid"
  },
  {
    id: 10,
    customerName: "Jackie Parker",
    customerPhoneNumber: "0987654321",
    customerAddress: "707 Maple St, Shelbyville",
    products: [
      {
        product: productsData[3].name, // Eco-friendly Notebook
        rate: productsData[3].price,
        quantity: 3,
        totalPrice: productsData[3].price * 3
      },
      {
        product: productsData[4].name, // LED Desk Lamp
        rate: productsData[4].price,
        quantity: 1,
        totalPrice: productsData[4].price * 1
      }
    ],
    overallTotalPrice: productsData[3].price * 3 + productsData[4].price * 1,
    dateTime:getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "paid"
  },
  {
    id: 11,
    customerName: "Kevin Anderson",
    customerPhoneNumber: "6785432109",
    customerAddress: "707 Willow St, Rivertown",
    products: [
      {
        product: productsData[14].name, // Laxative Tablets
        rate: productsData[14].price,
        quantity: 3,
        totalPrice: productsData[14].price * 3
      }
    ],
    overallTotalPrice: productsData[14].price * 3,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "unpaid"
  },
  {
    id: 12,
    customerName: "Linda White",
    customerPhoneNumber: "5674321098",
    customerAddress: "808 Spruce St, Westville",
    products: [
      {
        product: productsData[15].name, // Antiseptic Liquid
        rate: productsData[15].price,
        quantity: 10,
        totalPrice: productsData[15].price * 10
      },
      {
        product: productsData[16].name, // Cough Suppressant
        rate: productsData[16].price,
        quantity: 2,
        totalPrice: productsData[16].price * 2
      }
    ],
    overallTotalPrice: productsData[15].price * 10 + productsData[16].price * 2,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "paid"
  },
  {
    id: 13,
    customerName: "Maria Hernandez",
    customerPhoneNumber: "4563210987",
    customerAddress: "909 Cherry St, Lakeside",
    products: [
      {
        product: productsData[17].name, // Eye Drops
        rate: productsData[17].price,
        quantity: 6,
        totalPrice: productsData[17].price * 6
      }
    ],
    overallTotalPrice: productsData[17].price * 6,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "paid"
  },
  {
    id: 14,
    customerName: "Nicholas Moore",
    customerPhoneNumber: "3452109876",
    customerAddress: "1010 Pine St, Sunnydale",
    products: [
      {
        product: productsData[1].name, // Cough Syrup
        rate: productsData[1].price,
        quantity: 4,
        totalPrice: productsData[1].price * 4
      },
      {
        product: productsData[4].name, // Ibuprofen
        rate: productsData[4].price,
        quantity: 2,
        totalPrice: productsData[4].price * 2
      }
    ],
    overallTotalPrice: productsData[1].price * 4 + productsData[4].price * 2,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "unpaid"
  },
  {
    id: 15,
    customerName: "Olivia Scott",
    customerPhoneNumber: "2341098765",
    customerAddress: "2021 Elm St, Bayshore",
    products: [
      {
        product: productsData[5].name, // Multivitamin Capsules
        rate: productsData[5].price,
        quantity: 3,
        totalPrice: productsData[5].price * 3
      }
    ],
    overallTotalPrice: productsData[5].price * 3,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "paid"
  },
  {
    id: 16,
    customerName: "Peter Clark",
    customerPhoneNumber: "1230987654",
    customerAddress: "3032 Maple St, Greenhill",
    products: [
      {
        product: productsData[6].name, // Allergy Relief Tablets
        rate: productsData[6].price,
        quantity: 5,
        totalPrice: productsData[6].price * 5
      },
      {
        product: productsData[8].name, // Calcium Tablets
        rate: productsData[8].price,
        quantity: 4,
        totalPrice: productsData[8].price * 4
      }
    ],
    overallTotalPrice: productsData[6].price * 5 + productsData[8].price * 4,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "unpaid"
  },
  {
    id: 17,
    customerName: "Quincy Baker",
    customerPhoneNumber: "0987654321",
    customerAddress: "4043 Birch St, Meadowfield",
    products: [
      {
        product: productsData[9].name, // Cough Lozenges
        rate: productsData[9].price,
        quantity: 8,
        totalPrice: productsData[9].price * 8
      }
    ],
    overallTotalPrice: productsData[9].price * 8,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "paid"
  },
  {
    id: 18,
    customerName: "Rachel Parker",
    customerPhoneNumber: "8765432109",
    customerAddress: "5054 Cedar St, Rockville",
    products: [
      {
        product: productsData[10].name, // Cold and Flu Capsules
        rate: productsData[10].price,
        quantity: 7,
        totalPrice: productsData[10].price * 7
      }
    ],
    overallTotalPrice: productsData[10].price * 7,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "paid"
  },
  {
    id: 19,
    customerName: "Samuel Young",
    customerPhoneNumber: "7654321098",
    customerAddress: "6065 Willow St, Hillside",
    products: [
      {
        product: productsData[11].name, // Anti-Fungal Cream
        rate: productsData[11].price,
        quantity: 2,
        totalPrice: productsData[11].price * 2
      }
    ],
    overallTotalPrice: productsData[11].price * 2,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "unpaid"
  },
  {
    id: 20,
    customerName: "Thomas King",
    customerPhoneNumber: "6543210987",
    customerAddress: "7076 Oak St, Valleyview",
    products: [
      {
        product: productsData[12].name, // Antihistamine Tablets
        rate: productsData[12].price,
        quantity: 6,
        totalPrice: productsData[12].price * 6
      },
      {
        product: productsData[13].name, // Nasal Decongestant Spray
        rate: productsData[13].price,
        quantity: 1,
        totalPrice: productsData[13].price * 1
      }
    ],
    overallTotalPrice: productsData[12].price * 6 + productsData[13].price * 1,
    dateTime: getRandomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    status: "paid"
  }
];