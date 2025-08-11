/*
* =================================================================
* FILE: App.js
* DESCRIPTION: Main application component with integrated Firebase setup and Admin Panel.
* =================================================================
*/
import React, { useState, useEffect, createContext, useContext } from 'react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    signInAnonymously,
    signInWithCustomToken
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDocs,
    deleteDoc,
    onSnapshot,
    addDoc
} from 'firebase/firestore';

// --- Firebase Configuration ---
// This setup uses environment variables for security, which is a best practice.
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "AIzaSyAI5s_mX2rAegULPfIqNsdT703GzCHkimc",
        authDomain: "e-commerece-website-3c5c3.firebaseapp.com",
        projectId: "e-commerece-website-3c5c3",
        storageBucket: "e-commerece-website-3c5c3.firebasestorage.app",
        messagingSenderId: "289861059864",
        appId: "1:289861059864:web:c235b04da8f6fe269aca6d",
        measurementId: "G-FW6LTBDW7W"
      };

// --- Initialize Firebase and get services ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- App ID (for Firestore paths) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-ecommerce-app';

// --- Authentication Context ---
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false); // New state for admin status
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const attemptAuth = async () => {
            try {
                // Use the initial auth token if provided by the environment
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    // Fallback to anonymous sign-in
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication Error:", error);
                await signInAnonymously(auth); // Fallback to anonymous on error
            }
        };
        
        attemptAuth();

        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            // Check for admin user
            if (user && user.email === 'admin@vogue.com') {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = { user, isAdmin, loading }; // Add isAdmin to context value

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};


// --- Product Data ---
const initialProducts = [
    // Men
    { id: 'm1', name: 'Classic Cotton Shirt', category: 'men-shirts', price: 2499, image: 'https://placehold.co/400x400/E2E8F0/4A5568?text=Men+Shirt' },
    { id: 'm2', name: 'Graphic Print T-Shirt', category: 'men-t-shirts', price: 999, image: 'https://placehold.co/400x400/E2E8F0/4A5568?text=Men+T-Shirt' },
    { id: 'm3', name: 'Slim-Fit Chinos', category: 'men-trousers', price: 3499, image: 'https://placehold.co/400x400/E2E8F0/4A5568?text=Men+Trousers' },
    { id: 'm4', name: 'Wool Blend Peacoat', category: 'men-winter-wear', price: 7999, image: 'https://placehold.co/400x400/E2E8F0/4A5568?text=Men+Winter+Wear' },
    // Women
    { id: 'w1', name: 'Silk Blouse', category: 'women-tops', price: 2999, image: 'https://placehold.co/400x400/CBD5E0/4A5568?text=Women+Top' },
    { id: 'w2', name: 'High-Waist Jeans', category: 'women-jeans', price: 4499, image: 'https://placehold.co/400x400/CBD5E0/4A5568?text=Women+Jeans' },
    { id: 'w3', name: 'A-Line Skirt', category: 'women-skirts', price: 1999, image: 'https://placehold.co/400x400/CBD5E0/4A5568?text=Women+Skirt' },
    { id: 'w4', name: 'Cashmere Sweater', category: 'women-winter-wear', price: 9999, image: 'https://placehold.co/400x400/CBD5E0/4A5568?text=Women+Winter+Wear' },
    // Children
    { id: 'c1', name: 'Dinosaur Graphic Tee', category: 'children-t-shirts', price: 799, image: 'https://placehold.co/400x400/BEE3F8/2C5282?text=Kids+T-Shirt' },
    { id: 'c2', name: 'Fleece-Lined Hoodie', category: 'children-outerwear', price: 1499, image: 'https://placehold.co/400x400/BEE3F8/2C5282?text=Kids+Hoodie' },
    { id: 'c3', name: 'Pull-On Jeans', category: 'children-bottoms', price: 999, image: 'https://placehold.co/400x400/BEE3F8/2C5282?text=Kids+Jeans' },
    // Accessories
    { id: 'a1', name: 'Leather Belt', category: 'accessories-belts', price: 1299, image: 'https://placehold.co/400x400/D6BCFA/44337A?text=Belt' },
    { id: 'a2', name: 'Canvas Tote Bag', category: 'accessories-bags', price: 999, image: 'https://placehold.co/400x400/D6BCFA/44337A?text=Bag' },
    { id: 'a3', name: 'Knit Scarf', category: 'accessories-scarves', price: 799, image: 'https://placehold.co/400x400/D6BCFA/44337A?text=Scarf' },
];

// --- Helper function to setup initial products in Firestore ---
const setupInitialProducts = async () => {
    const productsCollectionRef = collection(db, `/artifacts/${appId}/public/data/products`);
    const querySnapshot = await getDocs(productsCollectionRef);
    if (querySnapshot.empty) {
        console.log("Setting up initial products...");
        const promises = initialProducts.map(product => {
            const productRef = doc(productsCollectionRef, product.id);
            return setDoc(productRef, product);
        });
        await Promise.all(promises);
        console.log("Initial products have been set up in Firestore.");
    } else {
        console.log("Products collection already exists.");
    }
};


// --- ICONS ---
const ShoppingCartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const HeartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

// --- Components ---

const Navbar = ({ setPage, cartCount, wishlistCount }) => {
    const { user, isAdmin } = useAuth();
    const [openDropdown, setOpenDropdown] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const navLinks = {
        Men: { 'Shirts': 'men-shirts', 'T-Shirts': 'men-t-shirts', 'Trousers': 'men-trousers', 'Winter Wear': 'men-winter-wear' },
        Women: { 'Tops': 'women-tops', 'Jeans': 'women-jeans', 'Skirts': 'women-skirts', 'Winter Wear': 'women-winter-wear' },
        Children: { 'T-Shirts': 'children-t-shirts', 'Outerwear': 'children-outerwear', 'Bottoms': 'children-bottoms' },
        Accessories: { 'Belts': 'accessories-belts', 'Bags': 'accessories-bags', 'Scarves': 'accessories-scarves' },
    };

    const handleLogout = async () => {
        await signOut(auth);
        setPage('home');
    };

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <a href="#" onClick={() => setPage('home')} className="text-2xl font-bold text-gray-800 tracking-wider">
                            VOGUE
                        </a>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {Object.keys(navLinks).map(category => (
                            <div key={category} className="relative group px-4 py-7" onMouseEnter={() => setOpenDropdown(category)} onMouseLeave={() => setOpenDropdown('')}>
                                <button className="text-gray-600 group-hover:text-gray-900 transition duration-150 ease-in-out uppercase text-sm font-medium">
                                    {category}
                                </button>
                                <div className={`absolute top-full -left-4 mt-0 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 transform transition-transform duration-300 ease-in-out ${openDropdown === category ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                        {Object.entries(navLinks[category]).map(([subCategory, page]) => (
                                            <a key={page} href="#" onClick={() => setPage(page)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                                                {subCategory}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Icons & Search */}
                    <div className="flex items-center space-x-4">
                         {isAdmin && (
                            <button onClick={() => setPage('admin')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition">
                                Admin Panel
                            </button>
                        )}
                        <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="text-gray-600 hover:text-gray-900">
                            <SearchIcon />
                        </button>
                        {user && !user.isAnonymous ? (
                            <div className="relative group">
                                <button onClick={() => setPage('profile')} className="text-gray-600 hover:text-gray-900"><UserIcon /></button>
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
                                    <div className="py-1">
                                        <a href="#" onClick={() => setPage('profile')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</a>
                                        <a href="#" onClick={handleLogout} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</a>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setPage('login')} className="text-gray-600 hover:text-gray-900"><UserIcon /></button>
                        )}
                        <button onClick={() => setPage('wishlist')} className="relative text-gray-600 hover:text-gray-900">
                            <HeartIcon />
                            {wishlistCount > 0 && <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">{wishlistCount}</span>}
                        </button>
                        <button onClick={() => setPage('cart')} className="relative text-gray-600 hover:text-gray-900">
                            <ShoppingCartIcon />
                            {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">{cartCount}</span>}
                        </button>
                    </div>
                </div>
            </div>
            {/* Search Bar */}
            {isSearchOpen && (
                <div className="absolute top-full left-0 w-full bg-white shadow-md p-4 transition-all duration-300">
                    <div className="max-w-7xl mx-auto flex">
                        <input type="text" placeholder="Search for products..." className="w-full px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button className="bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-700">
                            <SearchIcon />
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

const ShopNowModal = ({ setPage, setShowModal }) => {
    const categories = {
        'Men': 'men-shirts',
        'Women': 'women-tops',
        'Children': 'children-t-shirts',
        'Accessories': 'accessories-bags'
    };

    const handleCategoryClick = (page) => {
        setPage(page);
        setShowModal(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={() => setShowModal(false)}>
            <div className="bg-white p-8 rounded-lg shadow-xl text-center" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6">Where to?</h2>
                <div className="grid grid-cols-2 gap-4">
                    {Object.entries(categories).map(([name, page]) => (
                        <button key={name} onClick={() => handleCategoryClick(page)} className="px-6 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-indigo-500 hover:text-white transition duration-300">
                            {name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const FeaturedProducts = ({ products, onAddToCart, onAddToWishlist, setPage }) => (
    <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Featured Products</h2>
            <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
                {products.slice(0, 8).map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} onAddToWishlist={onAddToWishlist} setPage={setPage} />
                ))}
            </div>
        </div>
    </div>
);

const HomePage = ({ setPage, products, onAddToCart, onAddToWishlist }) => {
    const animatedTexts = ["Timeless Style", "Modern Trends", "Unmatched Quality"];
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [showShopNowModal, setShowShopNowModal] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTextIndex((prevIndex) => (prevIndex + 1) % animatedTexts.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [animatedTexts.length]);

    return (
        <div>
            {showShopNowModal && <ShopNowModal setPage={setPage} setShowModal={setShowShopNowModal} />}
            {/* Hero Section */}
            <div className="relative bg-gray-900 text-white h-[60vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0">
                    <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop" alt="Hero background" className="w-full h-full object-cover opacity-40" />
                </div>
                <div className="relative z-10 text-center animate-fade-in-up">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                        Discover Your Signature Look
                    </h1>
                    <div className="h-12 md:h-16">
                        <span className="text-2xl md:text-4xl font-semibold text-indigo-400 transition-opacity duration-1000" style={{ opacity: 1 }}>
                            {animatedTexts[currentTextIndex]}
                        </span>
                    </div>
                    <button onClick={() => setShowShopNowModal(true)} className="mt-8 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-full text-lg font-semibold transition duration-300 transform hover:scale-105">
                        Shop Now
                    </button>
                </div>
            </div>

            {/* Featured Products Section */}
            <FeaturedProducts products={products} onAddToCart={onAddToCart} onAddToWishlist={onAddToWishlist} setPage={setPage} />

            {/* Categories Section */}
            <div className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Shop by Category</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="group relative cursor-pointer overflow-hidden rounded-lg shadow-lg" onClick={() => setPage('men-shirts')}>
                            <img src="https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=2070&auto=format&fit=crop" className="w-full h-80 object-cover rounded-lg transform group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg group-hover:bg-opacity-50 transition">
                                <h3 className="text-white text-2xl font-bold">Men</h3>
                            </div>
                        </div>
                        <div className="group relative cursor-pointer overflow-hidden rounded-lg shadow-lg" onClick={() => setPage('women-tops')}>
                            <img src="https://images.unsplash.com/photo-1572804013427-4d7ca7268217?q=80&w=1965&auto=format&fit=crop" className="w-full h-80 object-cover rounded-lg transform group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg group-hover:bg-opacity-50 transition">
                                <h3 className="text-white text-2xl font-bold">Women</h3>
                            </div>
                        </div>
                        <div className="group relative cursor-pointer overflow-hidden rounded-lg shadow-lg" onClick={() => setPage('children-t-shirts')}>
                            <img src="https://images.unsplash.com/photo-1514090098549-5c34c4149667?q=80&w=1974&auto=format&fit=crop" className="w-full h-80 object-cover rounded-lg transform group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg group-hover:bg-opacity-50 transition">
                                <h3 className="text-white text-2xl font-bold">Children</h3>
                            </div>
                        </div>
                        <div className="group relative cursor-pointer overflow-hidden rounded-lg shadow-lg" onClick={() => setPage('accessories-bags')}>
                            <img src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1935&auto=format&fit=crop" className="w-full h-80 object-cover rounded-lg transform group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg group-hover:bg-opacity-50 transition">
                                <h3 className="text-white text-2xl font-bold">Accessories</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProductCard = ({ product, onAddToCart, onAddToWishlist, setPage }) => (
    <div className="group relative border rounded-lg p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 animate-fade-in">
        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200 lg:aspect-none cursor-pointer" onClick={() => setPage(`product/${product.id}`)}>
            <img src={product.image} alt={product.name} className="h-full w-full object-cover object-center lg:h-full lg:w-full transition-transform duration-500 group-hover:scale-110" />
        </div>
        <div className="mt-4 flex justify-between">
            <div>
                <h3 className="text-sm text-gray-700">
                    <a href="#" onClick={(e) => { e.preventDefault(); setPage(`product/${product.id}`); }}>
                        <span aria-hidden="true" className="absolute inset-0" />
                        {product.name}
                    </a>
                </h3>
            </div>
            <p className="text-sm font-medium text-gray-900">₹{product.price}</p>
        </div>
        <div className="mt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button onClick={() => onAddToCart(product)} className="text-xs px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition w-full mr-2">Add to Cart</button>
            <button onClick={() => onAddToWishlist(product)} className="text-gray-400 hover:text-red-500 transition p-2 rounded-md hover:bg-gray-100"><HeartIcon /></button>
        </div>
    </div>
);


const ProductListPage = ({ category, setPage, onAddToCart, onAddToWishlist, products }) => {
    const [filteredProducts, setFilteredProducts] = useState([]);
    
    useEffect(() => {
        if (category) {
            setFilteredProducts(products.filter(p => p.category === category));
        } else {
            setFilteredProducts(products);
        }
    }, [category, products]);

    const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return (
        <div className="bg-white">
            <div className="max-w-2xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:max-w-7xl lg:px-8">
                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">{categoryName}</h2>

                <div className="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
                    {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} onAddToWishlist={onAddToWishlist} setPage={setPage} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const ProductDetailPage = ({ productId, onAddToCart, onAddToWishlist, products }) => {
    const [product, setProduct] = useState(null);

    useEffect(() => {
        const foundProduct = products.find(p => p.id === productId);
        setProduct(foundProduct);
    }, [productId, products]);

    if (!product) return <div className="text-center py-20">Loading product...</div>;

    return (
        <div className="bg-white animate-fade-in">
            <div className="pt-6">
                {/* Image gallery */}
                <div className="max-w-2xl mx-auto sm:px-6 lg:max-w-7xl lg:px-8 lg:grid lg:grid-cols-2 lg:gap-x-8">
                    <div className="aspect-w-4 aspect-h-5 sm:rounded-lg sm:overflow-hidden lg:aspect-w-3 lg:aspect-h-4">
                        <img src={product.image} alt={product.name} className="w-full h-full object-center object-cover" />
                    </div>

                    {/* Product info */}
                    <div className="max-w-2xl mx-auto px-4 pt-10 pb-16 sm:px-6 lg:max-w-7xl lg:px-8 lg:pt-16 lg:pb-24">
                        <div className="lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-8">
                            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">{product.name}</h1>
                        </div>

                        <div className="mt-4 lg:mt-0">
                            <h2 className="sr-only">Product information</h2>
                            <p className="text-3xl text-gray-900">₹{product.price}</p>
                        </div>

                        <div className="mt-10">
                            <h3 className="text-sm font-medium text-gray-900">Description</h3>
                            <div className="mt-4">
                                <p className="text-base text-gray-600">This is a placeholder description. In a real store, you'd find details about the fabric, fit, and care instructions for the {product.name}.</p>
                            </div>
                        </div>

                        <div className="mt-10 flex gap-4">
                            <button onClick={() => onAddToCart(product)} type="submit" className="flex-1 bg-indigo-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                Add to bag
                            </button>
                            <button onClick={() => onAddToWishlist(product)} className="p-3 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-md">
                                <HeartIcon />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CartPage = ({ cart, setPage }) => {
    const { user } = useAuth();
    
    const removeFromCart = async (productId) => {
        if (!user || user.isAnonymous) {
            console.error("User not logged in to manage cart.");
            return;
        }
        const userId = user.uid;
        const cartDocRef = doc(db, `/artifacts/${appId}/users/${userId}/cart`, productId);
        await deleteDoc(cartDocRef);
    };

    const total = cart.reduce((sum, item) => sum + item.price, 0);

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
            <h1 className="text-3xl font-bold mb-8">Your Shopping Cart</h1>
            {cart.length === 0 ? (
                <p>Your cart is empty. <a href="#" onClick={() => setPage('men-shirts')} className="text-indigo-600 hover:underline">Start shopping!</a></p>
            ) : (
                <div>
                    <ul className="divide-y divide-gray-200">
                        {cart.map(item => (
                            <li key={item.id} className="py-6 flex">
                                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                    <img src={item.image} alt={item.name} className="h-full w-full object-cover object-center" />
                                </div>
                                <div className="ml-4 flex flex-1 flex-col">
                                    <div>
                                        <div className="flex justify-between text-base font-medium text-gray-900">
                                            <h3><a href="#" onClick={() => setPage(`product/${item.id}`)}>{item.name}</a></h3>
                                            <p className="ml-4">₹{item.price.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 items-end justify-between text-sm">
                                        <p className="text-gray-500">Qty 1</p>
                                        <div className="flex">
                                            <button onClick={() => removeFromCart(item.id)} type="button" className="font-medium text-indigo-600 hover:text-indigo-500">Remove</button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="border-t border-gray-200 py-6">
                        <div className="flex justify-between text-base font-medium text-gray-900">
                            <p>Subtotal</p>
                            <p>₹{total.toFixed(2)}</p>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">Shipping and taxes calculated at checkout.</p>
                        <div className="mt-6">
                            <button onClick={() => setPage('checkout')} className="w-full flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700">Checkout</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const WishlistPage = ({ wishlist, onAddToCart, setPage }) => {
    const { user } = useAuth();
    
    const removeFromWishlist = async (productId) => {
        if (!user || user.isAnonymous) {
             console.error("User not logged in to manage wishlist.");
            return;
        }
        const userId = user.uid;
        const wishlistDocRef = doc(db, `/artifacts/${appId}/users/${userId}/wishlist`, productId);
        await deleteDoc(wishlistDocRef);
    };
    
    const handleMoveToCart = (product) => {
        onAddToCart(product);
        removeFromWishlist(product.id);
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
            <h1 className="text-3xl font-bold mb-8">Your Wishlist</h1>
            {wishlist.length === 0 ? (
                <p>Your wishlist is empty. <a href="#" onClick={() => setPage('men-shirts')} className="text-indigo-600 hover:underline">Find something you love!</a></p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {wishlist.map(item => (
                        <div key={item.id} className="border rounded-lg p-4 flex flex-col text-center transition-all duration-300 hover:shadow-xl">
                            <img src={item.image} alt={item.name} className="w-full h-48 object-cover rounded-md mb-4 cursor-pointer" onClick={() => setPage(`product/${item.id}`)} />
                            <h3 className="font-semibold text-gray-800">{item.name}</h3>
                            <p className="text-gray-600 my-2">₹{item.price.toFixed(2)}</p>
                            <div className="mt-auto flex flex-col space-y-2">
                                <button onClick={() => handleMoveToCart(item)} className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition">Move to Cart</button>
                                <button onClick={() => removeFromWishlist(item.id)} className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const LoginPage = ({ setPage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setPage('home');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input id="email-address" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Email address" />
                        </div>
                        <div>
                            <input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Password" />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div>
                        <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Sign in
                        </button>
                    </div>
                </form>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Or{' '}
                    <a href="#" onClick={() => setPage('signup')} className="font-medium text-indigo-600 hover:text-indigo-500">
                        create a new account
                    </a>
                </p>
            </div>
        </div>
    );
};

const SignUpPage = ({ setPage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            setPage('home');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input id="email-address" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Email address" />
                        </div>
                        <div>
                            <input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Password" />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div>
                        <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Sign up
                        </button>
                    </div>
                </form>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <a href="#" onClick={() => setPage('login')} className="font-medium text-indigo-600 hover:text-indigo-500">
                        Sign in
                    </a>
                </p>
            </div>
        </div>
    );
};

const CheckoutPage = ({ cart }) => {
    const total = cart.reduce((sum, item) => sum + item.price, 0);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        alert('Thank you for your order! (This is a demo)');
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
            <h1 className="text-3xl font-bold mb-8">Checkout</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Shipping Form */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Shipping Information</h2>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <input type="text" placeholder="Full Name" required className="w-full p-2 border rounded-md" />
                        <input type="email" placeholder="Email Address" required className="w-full p-2 border rounded-md" />
                        <input type="text" placeholder="Street Address" required className="w-full p-2 border rounded-md" />
                        <div className="flex space-x-4">
                            <input type="text" placeholder="City" required className="w-1/2 p-2 border rounded-md" />
                            <input type="text" placeholder="ZIP Code" required className="w-1/2 p-2 border rounded-md" />
                        </div>
                        <input type="text" placeholder="Country" required className="w-full p-2 border rounded-md" />
                        
                        <h2 className="text-xl font-semibold mb-4 pt-6">Payment Details</h2>
                        <div className="p-4 border rounded-md bg-gray-50">
                            <p className="text-gray-600">This is a demo. No real payment will be processed.</p>
                            <div className="mt-4">
                                <input type="text" placeholder="Card Number" className="w-full p-2 border rounded-md" />
                                <div className="flex space-x-4 mt-4">
                                    <input type="text" placeholder="MM / YY" className="w-1/2 p-2 border rounded-md" />
                                    <input type="text" placeholder="CVC" className="w-1/2 p-2 border rounded-md" />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 transition-colors font-semibold">
                            Place Order (₹{total.toFixed(2)})
                        </button>
                    </form>
                </div>
                {/* Order Summary */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Your Order</h2>
                    <div className="border rounded-md p-4 space-y-4">
                        {cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <img src={item.image} alt={item.name} className="h-16 w-16 rounded-md object-cover mr-4" />
                                    <div>
                                        <p className="font-semibold">{item.name}</p>
                                        <p className="text-sm text-gray-500">Qty: 1</p>
                                    </div>
                                </div>
                                <p>₹{item.price.toFixed(2)}</p>
                            </div>
                        ))}
                        <div className="border-t pt-4 mt-4 flex justify-between font-bold text-lg">
                            <p>Total</p>
                            <p>₹{total.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProfilePage = ({ setPage }) => {
    const { user } = useAuth();

    const handleLogout = async () => {
        await signOut(auth);
        setPage('home');
    };

    if (!user || user.isAnonymous) {
        return (
            <div className="text-center py-20">
                <p>You are not logged in.</p>
                <button onClick={() => setPage('login')} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    Login
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
            <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
            <div className="bg-white p-8 shadow-lg rounded-lg">
                <p className="text-lg"><strong>Email:</strong> {user.email}</p>
                <p className="text-sm text-gray-500 mt-2"><strong>User ID:</strong> {user.uid}</p>
                <button onClick={handleLogout} className="mt-8 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                    Logout
                </button>
            </div>
        </div>
    );
};

const AdminPanelPage = () => {
    // State for the "Add Product" form
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('men-shirts');
    const [image, setImage] = useState('');
    const [addMessage, setAddMessage] = useState('');

    // State for managing existing products
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteMessage, setDeleteMessage] = useState('');

    const productCategories = [
        { label: "Men's Shirts", value: 'men-shirts' },
        { label: "Men's T-Shirts", value: 'men-t-shirts' },
        { label: "Men's Trousers", value: 'men-trousers' },
        { label: "Men's Winter Wear", value: 'men-winter-wear' },
        { label: "Women's Tops", value: 'women-tops' },
        { label: "Women's Jeans", value: 'women-jeans' },
        { label: "Women's Skirts", value: 'women-skirts' },
        { label: "Women's Winter Wear", value: 'women-winter-wear' },
        { label: "Children's T-Shirts", value: 'children-t-shirts' },
        { label: "Children's Outerwear", value: 'children-outerwear' },
        { label: "Children's Bottoms", value: 'children-bottoms' },
        { label: "Accessory: Belts", value: 'accessories-belts' },
        { label: "Accessory: Bags", value: 'accessories-bags' },
        { label: "Accessory: Scarves", value: 'accessories-scarves' },
    ];

    // Effect to fetch products for the management list
    useEffect(() => {
        const productsCollectionRef = collection(db, `/artifacts/${appId}/public/data/products`);
        const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(productsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAddProduct = async (e) => {
        e.preventDefault();
        setAddMessage('');
        if (!name || !price || !category || !image) {
            setAddMessage('Please fill out all fields.');
            return;
        }

        try {
            const productsCollectionRef = collection(db, `/artifacts/${appId}/public/data/products`);
            await addDoc(productsCollectionRef, {
                name,
                price: Number(price),
                category,
                image
            });
            setAddMessage('Product added successfully!');
            // Clear form
            setName('');
            setPrice('');
            setCategory('men-shirts');
            setImage('');
            setTimeout(() => setAddMessage(''), 3000);
        } catch (error) {
            console.error("Error adding product: ", error);
            setAddMessage('Error adding product. Please try again.');
        }
    };

    const handleDeleteProduct = async (productId) => {
        setDeleteMessage('');
        try {
            const productDocRef = doc(db, `/artifacts/${appId}/public/data/products`, productId);
            await deleteDoc(productDocRef);
            setDeleteMessage('Product deleted successfully!');
            setTimeout(() => setDeleteMessage(''), 3000);
        } catch (error) {
            console.error("Error deleting product: ", error);
            setDeleteMessage('Error deleting product.');
            setTimeout(() => setDeleteMessage(''), 3000);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
            <h1 className="text-3xl font-bold mb-8 text-center">Admin Panel</h1>
            
            {/* Add Product Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-semibold mb-6">Add New Product</h2>
                <form onSubmit={handleAddProduct} className="space-y-6 bg-white p-8 shadow-lg rounded-lg">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name</label>
                        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price (₹)</label>
                        <input type="number" id="price" value={price} onChange={(e) => setPrice(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                        <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                            {productCategories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="image" className="block text-sm font-medium text-gray-700">Image URL</label>
                        <input type="url" id="image" value={image} onChange={(e) => setImage(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    {addMessage && <p className={`text-sm ${addMessage.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{addMessage}</p>}
                    <div>
                        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Add Product
                        </button>
                    </div>
                </form>
            </div>

            {/* Manage Products Section */}
            <div>
                <h2 className="text-2xl font-semibold mb-6">Manage Existing Products</h2>
                {deleteMessage && <p className={`mb-4 text-sm ${deleteMessage.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{deleteMessage}</p>}
                <div className="bg-white p-8 shadow-lg rounded-lg">
                    {loading ? (
                        <p>Loading products...</p>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {products.map(product => (
                                <li key={product.id} className="py-4 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <img src={product.image} alt={product.name} className="h-16 w-16 rounded-md object-cover mr-4" />
                                        <div>
                                            <p className="font-semibold">{product.name}</p>
                                            <p className="text-sm text-gray-500">₹{product.price}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteProduct(product.id)} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition">
                                        Delete
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};


const Footer = ({ setPage }) => (
    <footer className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Shop</h3>
                    <ul className="mt-4 space-y-2">
                        <li><a href="#" onClick={() => setPage('men-shirts')} className="text-base text-gray-300 hover:text-white">Men</a></li>
                        <li><a href="#" onClick={() => setPage('women-tops')} className="text-base text-gray-300 hover:text-white">Women</a></li>
                        <li><a href="#" onClick={() => setPage('children-t-shirts')} className="text-base text-gray-300 hover:text-white">Children</a></li>
                        <li><a href="#" onClick={() => setPage('accessories-bags')} className="text-base text-gray-300 hover:text-white">Accessories</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider">About</h3>
                    <ul className="mt-4 space-y-2">
                        <li><a href="#" className="text-base text-gray-300 hover:text-white">Our Story</a></li>
                        <li><a href="#" className="text-base text-gray-300 hover:text-white">Careers</a></li>
                        <li><a href="#" className="text-base text-gray-300 hover:text-white">Press</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Support</h3>
                    <ul className="mt-4 space-y-2">
                        <li><a href="#" className="text-base text-gray-300 hover:text-white">Contact Us</a></li>
                        <li><a href="#" className="text-base text-gray-300 hover:text-white">FAQ</a></li>
                        <li><a href="#" className="text-base text-gray-300 hover:text-white">Shipping & Returns</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Connect</h3>
                    <ul className="mt-4 space-y-2">
                        <li><a href="#" className="text-base text-gray-300 hover:text-white">Instagram</a></li>
                        <li><a href="#" className="text-base text-gray-300 hover:text-white">Facebook</a></li>
                        <li><a href="#" className="text-base text-gray-300 hover:text-white">Twitter</a></li>
                    </ul>
                </div>
            </div>
            <div className="mt-8 border-t border-gray-700 pt-8 text-center">
                <p className="text-base text-gray-400">&copy; 2024 VOGUE. All rights reserved.</p>
            </div>
        </div>
    </footer>
);

const NotFoundPage = ({ setPage }) => (
    <div className="text-center py-20">
        <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
        <p className="mt-4">The page you are looking for does not exist.</p>
        <button onClick={() => setPage('home')} className="mt-8 px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Go to Homepage
        </button>
    </div>
);

// --- Main App Component ---
function App() {
    const [page, setPage] = useState('home');
    const [cart, setCart] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const { user, isAdmin } = useAuth();

    // --- Effect to set up and fetch products ---
    useEffect(() => {
        const fetchAndSetupProducts = async () => {
            await setupInitialProducts();
            const productsCollectionRef = collection(db, `/artifacts/${appId}/public/data/products`);
            const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
                const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProducts(productsData);
                setLoadingProducts(false);
            }, (error) => {
                console.error("Error fetching products: ", error);
                setLoadingProducts(false);
            });
            return () => unsubscribe();
        };

        fetchAndSetupProducts();
    }, []);

    // --- Effect for Cart and Wishlist listeners ---
    useEffect(() => {
        if (!user || user.isAnonymous) {
            setCart([]);
            setWishlist([]);
            return;
        }

        const userId = user.uid;

        // Cart listener
        const cartCollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/cart`);
        const cartUnsubscribe = onSnapshot(cartCollectionRef, (snapshot) => {
            const cartData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCart(cartData);
        });

        // Wishlist listener
        const wishlistCollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/wishlist`);
        const wishlistUnsubscribe = onSnapshot(wishlistCollectionRef, (snapshot) => {
            const wishlistData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWishlist(wishlistData);
        });

        return () => {
            cartUnsubscribe();
            wishlistUnsubscribe();
        };
    }, [user]);

    const handleAddToCart = async (product) => {
        if (!user) {
            setPage('login');
            return;
        }
        if (user.isAnonymous) {
            setPage('signup');
            return;
        }

        const userId = user.uid;
        const cartDocRef = doc(db, `/artifacts/${appId}/users/${userId}/cart`, product.id);
        await setDoc(cartDocRef, product);
    };

    const handleAddToWishlist = async (product) => {
        if (!user) {
            setPage('login');
            return;
        }
         if (user.isAnonymous) {
            setPage('signup');
            return;
        }
        
        const userId = user.uid;
        const wishlistDocRef = doc(db, `/artifacts/${appId}/users/${userId}/wishlist`, product.id);
        await setDoc(wishlistDocRef, product);
    };

    const renderPage = () => {
        if (page.startsWith('product/')) {
            const productId = page.split('/')[1];
            return <ProductDetailPage productId={productId} onAddToCart={handleAddToCart} onAddToWishlist={handleAddToWishlist} products={products} />;
        }

        switch (page) {
            case 'home':
                return <HomePage setPage={setPage} products={products} onAddToCart={handleAddToCart} onAddToWishlist={handleAddToWishlist} />;
            case 'cart':
                return <CartPage cart={cart} setPage={setPage} />;
            case 'wishlist':
                return <WishlistPage wishlist={wishlist} onAddToCart={handleAddToCart} setPage={setPage} />;
            case 'login':
                return <LoginPage setPage={setPage} />;
            case 'signup':
                return <SignUpPage setPage={setPage} />;
            case 'checkout':
                return <CheckoutPage cart={cart} />;
            case 'profile':
                return <ProfilePage setPage={setPage} />;
            case 'admin':
                return isAdmin ? <AdminPanelPage /> : <NotFoundPage setPage={setPage} />;
            default:
                // Check if it's a product category page
                const isCategoryPage = initialProducts.some(p => p.category === page);
                if (isCategoryPage) {
                    return <ProductListPage category={page} setPage={setPage} onAddToCart={handleAddToCart} onAddToWishlist={handleAddToWishlist} products={products} />;
                }
                return <NotFoundPage setPage={setPage} />;
        }
    };

    return (
        <div className="font-sans bg-white">
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
            `}</style>
            <Navbar setPage={setPage} cartCount={cart.length} wishlistCount={wishlist.length} />
            <main>
                {loadingProducts ? <div className="text-center py-20">Loading...</div> : renderPage()}
            </main>
            <Footer setPage={setPage} />
        </div>
    );
}

// Wrap the main App component with the AuthProvider
export default function EcommerceApp() {
    return (
        <AuthProvider>
            <App />
        </AuthProvider>
    );
}
