fetch("/api/todo")
    .then(res => res.json())
    .then(
        data => {
        document.getElementById("todoList").textContent = JSON.stringify(data, null, 2);
    })
    .catch(err => {
        console.error("Error fetching data: ", err);
    });
