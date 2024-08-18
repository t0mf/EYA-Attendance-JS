document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const output = document.getElementById('output');

    // Prevent default behavior (Prevent file from being opened)
    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('dragover');

        const file = event.dataTransfer.files[0];
        if (file && file.type === 'text/csv') {
            const reader = new FileReader();

            reader.onload = (e) => {
                const text = e.target.result;
                const data = parseCSV(text);
                displayData(data);
                downloadCSV(data);
                downloadFilteredCSV(data);
            };

            reader.readAsText(file);
        } else {
            alert('Please drop a CSV file.');
        }
    });

    function parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(header => header.trim());
        const rows = lines.slice(1);

        // Extract date headers
        const dateHeaders = headers.slice(3); // Assuming date columns start from index 3

        return rows.map(row => {
            const values = row.split(',').map(value => value.trim());
            const firstName = values[0] || '';
            const lastName = values[1] || '';

            // Initialize the person object
            let person = {
                firstName,
                lastName,
                memberType: "n/a", // Default memberType
                beenThroughProcess: false, // Default beenThroughProcess
                action: "", // Default action
                dates: {} // Initialize dates object
            };

            // Track added dates to avoid duplicates and manage weeksAbsent
            const addedDates = new Set();
            let weeksAbsent = 99; // Start at 99 if there has never been a value
            let seenAtLeastOnce = false; // Flag to track if the person has been seen

            // Fill in unique date data
            dateHeaders.forEach((dateHeader, index) => {
                let dateValue = values[index + 3]; // Dates start from index 3
                let parsedDate = parseDate(dateHeader);

                if (parsedDate && isSunday(parsedDate) && !addedDates.has(dateHeader)) {
                    // If there's a value, reset weeksAbsent to 0 and set seenAtLeastOnce to true
                    if (dateValue) {
                        weeksAbsent = 0;
                        seenAtLeastOnce = true;

                        // Determine the memberType based on the last non-absent week
                        if (dateValue === "attended as member") {
                            person.memberType = "member";
                        } else if (dateValue === "attended as visitor") {
                            person.memberType = "visitor";
                        } else if (dateValue === "attended as leader") {
                            person.memberType = "leader";
                        }
                    } else {
                        if (weeksAbsent !== 99) { // If it wasn't already 99, increment it
                            weeksAbsent++;
                        }
                    }

                    // Set beenThroughProcess to true if seenAtLeastOnce is true and weeksAbsent is greater than 5
                    if (seenAtLeastOnce && weeksAbsent > 5) {
                        person.beenThroughProcess = true;
                    }

                    // Add the date and weeksAbsent to the person object
                    person.dates[dateHeader] = weeksAbsent;

                    addedDates.add(dateHeader); // Mark date as added
                }
            });

            // Set action based on the last entry in the dates object
            const dateEntries = Object.entries(person.dates);
            if (dateEntries.length > 0) {
                const lastWeeksAbsent = dateEntries[dateEntries.length - 1][1];
                if (lastWeeksAbsent === 2) {
                    person.action = "text";
                } else if (lastWeeksAbsent === 3) {
                    person.action = "post card";
                } else if (lastWeeksAbsent === 4) {
                    person.action = "phone call";
                } else if (lastWeeksAbsent === 5) {
                    person.action = "visit";
                }
            }

            return person;
        });
    }

    function parseDate(dateString) {
        // Assuming dateString is in mm/dd/yyyy format
        let [month, day, year] = dateString.split('/').map(num => parseInt(num, 10));
        // Create and return a new Date object
        return new Date(year, month - 1, day);
    }

    function isSunday(date) {
        return date.getDay() === 0; // 0 represents Sunday
    }

    function displayData(data) {
        output.textContent = JSON.stringify(data, null, 2);
    }

    function downloadCSV(data) {
        // Create CSV header
        const headers = ["firstName", "lastName", "memberType", "beenThroughProcess", "action"];
        // Collect all unique date headers in the order they are encountered
        const dateHeaders = [];
        const dateHeaderSet = new Set(); // To check for duplicates

        data.forEach(person => {
            Object.keys(person.dates).forEach(date => {
                if (!dateHeaderSet.has(date)) {
                    dateHeaderSet.add(date);
                    dateHeaders.push(date);
                }
            });
        });

        // Create CSV header row
        const headerRow = [...headers, ...dateHeaders].join(',');

        // Create CSV rows
        const csvRows = [headerRow];
        data.forEach(person => {
            const row = [
                person.firstName,
                person.lastName,
                person.memberType,
                person.beenThroughProcess,
                person.action,
                ...dateHeaders.map(date => person.dates[date] !== undefined ? person.dates[date] : "0")
            ].join(',');
            csvRows.push(row);
        });

        // Create CSV content
        const csvContent = csvRows.join('\n');

        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attendance.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function downloadFilteredCSV(data) {
        // Filter data: persons with beenThroughProcess set to false and action not blank
        const filteredData = data.filter(person => !person.beenThroughProcess && person.action !== "");

        // Create CSV header
        const headerRow = ["firstName", "lastName", "memberType", "Text", "Post Card", "Phone Call", "Visit"];

        // Capitalize the first letter of each word
        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

        // Create CSV rows
        const csvRows = [headerRow.join(',')];
        filteredData.forEach(person => {
            const actionCapitalized = {
                "text": capitalize("text"),
                "post card": capitalize("post card"),
                "phone call": capitalize("phone call"),
                "visit": capitalize("visit")
            };

            const row = [
                person.firstName,
                person.lastName,
                person.memberType,
                actionCapitalized[person.action] === capitalize("text") ? capitalize("text") : "",
                actionCapitalized[person.action] === capitalize("post card") ? capitalize("post card") : "",
                actionCapitalized[person.action] === capitalize("phone call") ? capitalize("phone call") : "",
                actionCapitalized[person.action] === capitalize("visit") ? capitalize("visit") : ""
            ].join(',');
            csvRows.push(row);
        });

        // Create CSV content
        const csvContent = csvRows.join('\n');

        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'outreach.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
});
