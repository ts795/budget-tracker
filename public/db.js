let db;
// create a new db request for a "budget" database.
const request = indexedDB.open("budget", 1);

request.onupgradeneeded = function(event) {
   // create object store called "pending" and set autoIncrement to true
  const db = event.target.result;
  db.createObjectStore("pending", { autoIncrement: true });
  const objectStore = db.createObjectStore("transactions", { autoIncrement: true });
  objectStore.createIndex("date", "date");
};

request.onsuccess = function(event) {
  db = event.target.result;

  // check if app is online before reading from db
  if (navigator.onLine) {
    checkDatabase();
  }
};

request.onerror = function(event) {
  console.log("Woops! " + event.target.errorCode);
};

function saveRecord(record) {
  // create a transaction on the pending db with readwrite access
  const transaction = db.transaction(["pending"], "readwrite");

  // access your pending object store
  const store = transaction.objectStore("pending");

  // add record to your store with add method.
  store.add(record);
  addTransaction(record);
}

function addTransaction(record) {
  // create a transaction on the db with readwrite access
  const transaction = db.transaction(["transactions"], "readwrite");

  // access the transactions object store
  const store = transaction.objectStore("transactions");
  // add record to your store with add method.
  store.add(record);
}

function saveTransactions(records) {
  if (!db) {
    // Draw the chart and return if there is no database
    console.log("DB not initialized yet");
    return "db not initialized";
  }
  // create a transaction on the db with readwrite access
  const transaction = db.transaction(["transactions"], "readwrite");

  // access the transactions object store
  const store = transaction.objectStore("transactions");
  store.clear();
  // add record to your store with add method.
  for (var idx = 0; idx < records.length; idx++) {
    store.add(records[idx]);
  }
  populateTotal();
  populateTable();
  populateChart();
}

function getAllTransactions() {
  if (!db) {
    // Draw the chart and return if there is no database
    console.log("DB not initialized yet");
    populateTotal();
    populateTable();
    populateChart();
    return "db not initialized";
  }
  // open a transaction on your transactions db
  const transaction = db.transaction(["transactions"], "readwrite");
  // access your transactions object store
  const store = transaction.objectStore("transactions");
  var index = store.index('date');
  // get all records from store and set to a variable
  var cursorRequest = index.openCursor();
  
  cursorRequest.onsuccess = function(e) {
    // add to beginning of current array of data
    var cursor = e.target.result;
    if (cursor) {
      transactions.unshift(cursor.value);
      cursor.continue();
    }

    populateTotal();
    populateTable();
    populateChart();
  }
}


function checkDatabase() {
  // open a transaction on your pending db
  const transaction = db.transaction(["pending"], "readwrite");
  // access your pending object store
  const store = transaction.objectStore("pending");
  // get all records from store and set to a variable
  const getAll = store.getAll();

  getAll.onsuccess = function() {
    if (getAll.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json"
        }
      })
      .then(response => response.json())
      .then(() => {
        // if successful, open a transaction on your pending db
        const transaction = db.transaction(["pending"], "readwrite");

        // access your pending object store
        const store = transaction.objectStore("pending");

        // clear all items in your store
        store.clear();
      });
    }
  };
}

// listen for app coming back online
window.addEventListener("online", checkDatabase);
