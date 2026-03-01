import { Medicine } from "./types";

export const MEDICINES: Medicine[] = [
  {
    id: "1",
    name: "Paracetamol 500mg",
    brand: "Crocin",
    price: 45,
    category: "Pain Relief",
    image: "https://picsum.photos/seed/medicine1/400/400",
    description: "Effective for fever and mild to moderate pain relief."
  },
  {
    id: "2",
    name: "Amoxicillin 250mg",
    brand: "Mox",
    price: 120,
    category: "Antibiotics",
    image: "https://picsum.photos/seed/medicine2/400/400",
    description: "Broad-spectrum antibiotic for bacterial infections."
  },
  {
    id: "3",
    name: "Cetirizine 10mg",
    brand: "Okacet",
    price: 35,
    category: "Allergy",
    image: "https://picsum.photos/seed/medicine3/400/400",
    description: "Relief from runny nose, sneezing, and itching."
  },
  {
    id: "4",
    name: "Pantoprazole 40mg",
    brand: "Pan-40",
    price: 150,
    category: "Digestion",
    image: "https://picsum.photos/seed/medicine4/400/400",
    description: "Reduces stomach acid, used for GERD and acidity."
  },
  {
    id: "5",
    name: "Metformin 500mg",
    brand: "Glycomet",
    price: 85,
    category: "Diabetes",
    image: "https://picsum.photos/seed/medicine5/400/400",
    description: "First-line medication for Type 2 Diabetes management."
  }
];

export const DOCTORS = [
  {
    id: 1,
    name: "Dr. Sarah Sharma",
    specialty: "General Physician",
    experience: "12 years",
    rating: 4.8,
    fee: 500,
    image: "https://picsum.photos/seed/doc1/400/400",
    verified: true
  },
  {
    id: 2,
    name: "Dr. Rajesh Khanna",
    specialty: "Pediatrician",
    experience: "15 years",
    rating: 4.9,
    fee: 600,
    image: "https://picsum.photos/seed/doc2/400/400",
    verified: true
  },
  {
    id: 3,
    name: "Dr. Anita Desai",
    specialty: "Dermatologist",
    experience: "8 years",
    rating: 4.7,
    fee: 700,
    image: "https://picsum.photos/seed/doc3/400/400",
    verified: true
  },
  {
    id: 4,
    name: "Dr. Vikram Singh",
    specialty: "Cardiologist",
    experience: "20 years",
    rating: 4.9,
    fee: 1000,
    image: "https://picsum.photos/seed/doc4/400/400",
    verified: true
  },
  {
    id: 5,
    name: "Dr. Priya Iyer",
    specialty: "Gynecologist",
    experience: "10 years",
    rating: 4.8,
    fee: 800,
    image: "https://picsum.photos/seed/doc5/400/400",
    verified: true
  },
  {
    id: 6,
    name: "Dr. Amit Patel",
    specialty: "Orthopedic",
    experience: "14 years",
    rating: 4.6,
    fee: 750,
    image: "https://picsum.photos/seed/doc6/400/400",
    verified: true
  }
];
