import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // --- STATE ---
  // 1. STATE: To hold the products we get from our own backend
  const [products, setProducts] = useState([]);
  
  const [cart, setCart] = useState([]); // Memory for our shopping cart

  // NEW: State to control if the side cart panel is visible (true) or hidden (false)
  const [isCartOpen, setIsCartOpen] = useState(false);

  // ==========================================
  // NEW: SEARCH STATE
  // ==========================================
  const [searchTerm, setSearchTerm] = useState("");

  // ==========================================
  // NEW: ADMIN DASHBOARD STATE
  // ==========================================
  const [currentView, setCurrentView] = useState("store"); // Toggles between "store" and "admin"
  const [orders, setOrders] = useState([]); // Memory for the orders we fetch from the database

  // --- FETCH DATA FROM OUR BACKEND ---
  // 2. USE EFFECT: The "Page Load" magic.
  // In FridgeRaider, we fetched data when a user clicked "Search".
  // In an e-commerce store, we want to fetch products IMMEDIATELY when the page loads.
  useEffect(() => {
    
    // Define the fetch function
    const fetchProducts = async () => {
      try {
        // Look familiar? We are calling OUR OWN backend now, not TheMealDB!
        const response = await fetch('http://localhost:3000/api/products');
        const data = await response.json();
        
        // Save the data to React's memory
        setProducts(data);
      } catch (error) {
        console.error("Error fetching from backend:", error);
      }
    };

    // Execute the function
    fetchProducts();
    
  }, []); // <-- The empty array means "Only run this once when the component first loads"

  // ==========================================
  // NEW: FETCH ORDERS LOGIC (ADMIN)
  // ==========================================
  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  // Helper function to toggle views and load data if needed
  const handleToggleView = () => {
    if (currentView === "store") {
      fetchOrders(); // Grab the latest orders right before switching views
      setCurrentView("admin");
    } else {
      setCurrentView("store");
    }
  };


  // --- HANDLER: ADD TO CART ---
  const addToCart = (productToAdd) => {
    // Spread operator (...): "Take everything currently in the cart, 
    // and add this new product to the end of the list."
    setCart([...cart, productToAdd]);
    
    // Optional: A little feedback for the user
    console.log(`Added ${productToAdd.name} to cart!`);
  };

  // NEW: HANDLER: REMOVE FROM CART
  // We use the array index here because the user might add the SAME item twice,
  // and we only want to remove the specific one they clicked.
  const removeFromCart = (indexToRemove) => {
    setCart(cart.filter((_, index) => index !== indexToRemove));
  };

  // NEW: CALCULATE TOTAL PRICE
  // .reduce() is a powerful array method. It goes through every item in the cart 
  // and adds its price to a running 'total', starting at 0.
  // BUG FIX: We use parseFloat() because MySQL sends DECIMAL values as strings!
  const cartTotal = cart.reduce((total, item) => total + parseFloat(item.price), 0);

  // ==========================================
  // NEW: SEARCH FILTER LOGIC
  // ==========================================
  // We don't change the original 'products' array. We create a filtered view!
  const displayedProducts = products.filter((product) => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==========================================
  // NEW: HANDLER: CHECKOUT (POST REQUEST)
  // ==========================================
  const handleCheckout = async () => {
    try {
      // 1. The POST Request
      // We are sending data UP to the server, so we need extra configuration.
      const response = await fetch('http://localhost:3000/api/checkout', {
        method: 'POST', // Tell the server we are pushing data
        headers: {
          'Content-Type': 'application/json', // Tell the server to expect JSON
        },
        // The 'body' is the actual data package. We convert our JS object into a JSON string.
        body: JSON.stringify({ items: cart, total: cartTotal }) 
      });

      // 2. Wait for the server to reply
      const data = await response.json();
      
      // 3. Show success to the user!
      alert(`Success! ${data.message} \nYour Order ID is #${data.orderId}`);

      // 4. Clean up the UI
      setCart([]);           // Empty the cart
      setIsCartOpen(false);  // Close the slide-out panel

    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Something went wrong with the checkout.");
    }
  };

  // --- UI RENDER ---
  // 3. THE UI
  return (
    <div style={{ padding: "20px", fontFamily: "Arial", maxWidth: "1000px", margin: "0 auto", position: "relative" }}>
      
      {/* HEADER */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #eee", paddingBottom: "10px", marginBottom: "20px" }}>
        <h1 style={{ margin: 0 }}>ShopSimple 🛒</h1>
        
        <div style={{ display: "flex", gap: "15px" }}>
          {/* NEW: Admin Toggle Button */}
          <button 
            onClick={handleToggleView}
            style={{ padding: "10px 20px", background: "transparent", color: "#3498db", border: "1px solid #3498db", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {currentView === "store" ? "Admin Panel" : "Back to Store"}
          </button>

          {/* CART BUTTON: Only show the cart button if we are in the store view */}
          {currentView === "store" && (
            <button 
              onClick={() => setIsCartOpen(!isCartOpen)}
              style={{ padding: "10px 20px", background: cart.length > 0 ? "#e74c3c" : "#333", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", transition: "0.3s" }}
            >
              Cart ({cart.length})
            </button>
          )}
        </div>
      </header>


      {/* ========================================= */}
      {/* CONDITIONAL RENDERING: STORE vs ADMIN     */}
      {/* ========================================= */}

      {currentView === "store" ? (
        
        /* --- STOREFRONT VIEW --- */
        <>
          {/* THE SEARCH BAR */}
          <div style={{ marginBottom: "30px" }}>
            <input 
              type="text" 
              placeholder="Search for products (e.g., Mouse, Keyboard)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "12px", fontSize: "1rem", borderRadius: "5px", border: "1px solid #ccc" }}
            />
          </div>

          {/* PRODUCT GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            
            {/* We map over 'displayedProducts' instead of 'products' */}
            {displayedProducts.length > 0 ? (
              displayedProducts.map((product) => (
                <div key={product.id} style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "10px", textAlign: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                  
                  {/* Using a placeholder image for now */}
                  <img src={product.image} alt={product.name} style={{ width: "100%", borderRadius: "8px", marginBottom: "15px" }} />
                  
                  <h3 style={{ fontSize: "1.1rem", margin: "0 0 10px 0" }}>{product.name}</h3>
                  <p style={{ fontSize: "1.2rem", color: "#2ecc71", fontWeight: "bold", margin: "0 0 15px 0" }}>${product.price}</p>
                  
                  {/* BUTTON UPDATED: We use an arrow function here to pass the specific product to our logic */}
                  <button 
                    onClick={() => addToCart(product)}
                    style={{ width: "100%", padding: "10px", background: "#3498db", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    Add to Cart
                  </button>
                  
                </div>
              ))
            ) : (
              /* Feedback if search yields no results */
              <p style={{ textAlign: "center", gridColumn: "1 / -1", color: "#888", fontSize: "1.1rem" }}>
                No products found matching "{searchTerm}".
              </p>
            )}
            
          </div>
        </>

      ) : (

        /* --- ADMIN DASHBOARD VIEW --- */
        <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "10px", border: "1px solid #ddd" }}>
          <h2 style={{ marginTop: 0, color: "#333" }}>Recent Orders</h2>
          
          {orders.length === 0 ? (
            <p style={{ color: "#666" }}>No orders yet. Go buy something!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {orders.map((order) => {
                // We stringified the items when we sent them to MySQL. Now we parse them back!
                const itemsArray = JSON.parse(order.items_summary);
                
                return (
                  <div key={order.id} style={{ background: "white", padding: "15px", borderRadius: "8px", border: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                    <div>
                      <h4 style={{ margin: "0 0 8px 0", color: "#2c3e50" }}>Order #{order.id}</h4>
                      <p style={{ margin: 0, fontSize: "0.9rem", color: "#7f8c8d" }}>
                        {/* Map over the parsed items to show a readable list */}
                        {itemsArray.map(item => item.name).join(", ")}
                      </p>
                      <small style={{ color: "#bdc3c7", display: "block", marginTop: "8px" }}>
                        {new Date(order.order_date).toLocaleString()}
                      </small>
                    </div>
                    <div style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#27ae60" }}>
                      ${parseFloat(order.total_amount).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      )}


      {/* ========================================= */}
      {/* THE SLIDE-OUT CART PANEL (Remains unchanged)*/}
      {/* ========================================= */}
      
      {/* This entire block only renders if isCartOpen is true */}
      {isCartOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "350px",
          height: "100vh", // Takes up the full screen height
          backgroundColor: "#fff",
          color: "#333", // Forces text to be dark grey so it's visible!
          boxShadow: "-4px 0 15px rgba(0,0,0,0.1)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          zIndex: 1000 // Keeps it above the product grid
        }}>
          
          {/* Cart Panel Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "20px" }}>
            <h2 style={{ margin: 0 }}>Your Cart</h2>
            <button 
              onClick={() => setIsCartOpen(false)}
              style={{ background: "transparent", color: "#333", border: "none", fontSize: "1.5rem", cursor: "pointer" }}
            >
              ✖
            </button>
          </div>

          {/* Cart Items List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {cart.length === 0 ? (
              <p style={{ textAlign: "center", color: "#888", marginTop: "50px" }}>Your cart is empty.</p>
            ) : (
              // Map through the items currently in the cart
              cart.map((item, index) => (
                <div key={index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <div>
                    <h4 style={{ margin: "0 0 5px 0", fontSize: "1rem" }}>{item.name}</h4>
                    <p style={{ margin: 0, color: "#2ecc71", fontWeight: "bold" }}>${item.price}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(index)}
                    style={{ background: "#ff6b6b", color: "white", border: "none", borderRadius: "3px", padding: "5px 10px", cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer (Total & Checkout Button) */}
          <div style={{ borderTop: "2px solid #eee", paddingTop: "20px", marginTop: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: "bold", marginBottom: "20px" }}>
              <span>Total:</span>
              {/* BUG FIX: Added .toFixed(2) so it always looks like money (e.g., $600.00) */}
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            {/* CHECKOUT BUTTON UPDATED: onClick added to trigger our new handleCheckout function */}
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0} // Button is dead if cart is empty
              style={{ width: "100%", padding: "15px", background: cart.length === 0 ? "#ccc" : "#27ae60", color: "white", border: "none", borderRadius: "5px", fontSize: "1.1rem", cursor: cart.length === 0 ? "not-allowed" : "pointer", fontWeight: "bold" }}
            >
              Checkout
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

export default App;