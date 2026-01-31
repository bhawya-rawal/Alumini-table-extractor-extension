# Student Table Exporter (Chrome Extension)

A small Chrome extension that exports all pages of a paginated student table into a single CSV/Excel file automatically.

I built this to save time when downloading student records that are spread across multiple pages (10 rows per page).  
Instead of manually copying each page, this tool reads the visible table and clicks through all pages automatically.

It behaves exactly like a human user — no backend calls or scraping — just browser automation.

---

## ✨ Features

- One-click export
- Works on logged-in pages
- Reads only visible table data (safe + ethical)
- Automatically navigates pagination
- Combines all rows into one file
- Downloads CSV (opens directly in Excel)

---

## 🛠 How it works

1. Reads the current table rows from the page
2. Clicks the **Next** button
3. Waits for the next page to load
4. Repeats until all pages are covered
5. Merges everything and downloads `students.csv`

It simply automates what you would normally do manually.

---

## 📦 Installation (Developer Mode)

1. Download or clone this project
2. Open Chrome
3. Go to: `chrome://extensions/`
4. Enable **Developer Mode**
5. Click **Load unpacked**
6. Select this project folder

Done ✅

---

## ▶ Usage

1. Login to the website normally
2. Open the page with the student table
3. Click the extension icon
4. Press **Export All Pages**
5. CSV file downloads automatically

Open the file in Excel or Google Sheets.

---

## ⚙ Customization

If the Next button is not detected automatically:

Open `content.js` and update the selector:

```js
document.querySelector(".next, .pagination-next, button[aria-label='Next']")
```
