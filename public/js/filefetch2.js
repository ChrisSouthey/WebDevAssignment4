fetch("/api/todo")
    .then(res => res.json())
    .then(
        data => {
        const div = document.getElementById("readTodoList");

        data.forEach(todo => {
            const p = document.createElement("p");
            p.innerText = `User ${todo.id}- Title: ${todo.title} - Completed: ${todo.completed}`;
            div.appendChild(p);
        });
    });

