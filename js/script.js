    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
    import {
      getFirestore, doc, getDoc, collection, getDocs, query, where,
      onSnapshot, addDoc, updateDoc, deleteDoc, setDoc
    } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
    import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
    import { firebaseConfig } from "../firebase-config.js";

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    // DOM
    const calendarGrid = document.getElementById("calendar-grid");
    const monthYear = document.getElementById("month-year");
    const classTitleEl = document.getElementById("classTitle");
    const classSubjectEl = document.getElementById("classSubject");
    const classCodeLabel = document.getElementById("classCodeLabel");

    const menuBtn = document.getElementById("menuBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const leaveClassBtn = document.getElementById("leaveClass");
    const deleteClassBtn = document.getElementById("deleteClass");

    const overlay = document.getElementById("overlay");
    const modalTitle = document.getElementById("modalTitle");
    const modalText = document.getElementById("modalText");
    const modalCancel = document.getElementById("modalCancel");
    const modalConfirm = document.getElementById("modalConfirm");

    const taskPanel = document.getElementById("taskPanel");
    const closeTask = document.getElementById("closeTask");
    const saveTaskBtn = document.getElementById("saveTask");
    const cancelTaskBtn = document.getElementById("cancelTask");
    const taskTitle = document.getElementById("taskTitle");
    const taskDescription = document.getElementById("taskDescription");
    const selectedDateEl = document.getElementById("selectedDate");
    const taskMeta = document.getElementById("taskMeta");

    const todoList = document.getElementById("todoList");
    const newTodoInput = document.getElementById("newTodoInput");
    const addTodoBtn = document.getElementById("addTodoBtn");
    const addTaskBtn = document.getElementById("addTaskBtn");
    const viewMode = document.getElementById("viewMode");
    const addMode = document.getElementById("addMode");

    addTodoBtn.addEventListener("click", () => {
  const text = newTodoInput.value.trim();
  if (!text) return;

  const div = document.createElement("div");
  div.className = "todo-item";
  div.innerHTML = `
    <input type="checkbox">
    <span>${text}</span>
  `;

  const checkbox = div.querySelector("input");
  checkbox.addEventListener("change", () => {
    div.classList.toggle("completed", checkbox.checked);
  });

  todoList.appendChild(div);
  newTodoInput.value = "";
});




// Kapag pinindot ang green "+", itatago ang listahan at ipapakita ang form
addTaskBtn.addEventListener("click", () => {
  viewMode.style.display = "none";
  addMode.style.display = "block";
  // I-clear ang inputs bago mag-add
  taskTitle.value = "";
  taskDescription.value = "";
});

// Kapag pinindot ang "Cancel", babalik sa listahan
cancelTaskBtn.addEventListener("click", () => {
  addMode.style.display = "none";
  viewMode.style.display = "block";
});




    // state
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    let today = new Date();
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();
    let tasks = {};
    let currentUser = null;
    let classDoc = null;
    let classCode = null;
    let selectedDateKey = null;
    let unsubscribeTasks = null;

    // read classCode from URL
    const params = new URLSearchParams(window.location.search);
    classCode = params.get("code");
    if (!classCode) {
      alert("No class code provided. Returning to home.");
      window.location.href = "index.html";
    }

    const ymd = (y,m,d) => `${y}-${m+1}-${d}`;

    function generateCalendar(month, year) {
      calendarGrid.innerHTML = "";
      ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(dn => {
        const el = document.createElement("div"); el.className = "day-name"; el.textContent = dn; calendarGrid.appendChild(el);
      });

      const firstDay = new Date(year, month).getDay();
      const daysInMonth = 32 - new Date(year, month, 32).getDate();
      monthYear.textContent = `${monthNames[month]} ${year}`;

      for (let i=0;i<firstDay;i++) calendarGrid.appendChild(document.createElement("div"));

      for (let date=1; date<=daysInMonth; date++){
        const key = ymd(year,month,date);
        const box = document.createElement("div"); box.className="day-box"; box.setAttribute("data-date", key);
        const num = document.createElement("div"); num.className="day-number"; num.textContent = date; box.appendChild(num);

        if (tasks[key]) {
  box.classList.add("has-task");
}


        box.addEventListener("click", () => {
          const data = tasks[key] || null;
          openTaskPanel(key, `${monthNames[month]} ${date}, ${year}`, data);
        });

        calendarGrid.appendChild(box);
      }
    }

    // Makikinig sa click event sa buong task list container
document.getElementById("taskListContainer").addEventListener("click", async (e) => {
  if (e.target.classList.contains("mark-done-btn")) {
    const taskId = e.target.getAttribute("data-id");
    const taskRef = doc(db, "tasks", taskId); // Siguraduhing tama ang collection name mo (e.g., "tasks")

    // Kunin ang kasalukuyang oras sa format na (1:30 PM)
    const timeFinished = new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    try {
      // I-update ang Firestore: Magdagdag ng object sa finishedBy array
      await updateDoc(taskRef, {
        finishedBy: arrayUnion({
          email: currentUser.email,
          time: timeFinished,
          timestamp: serverTimestamp() // Para sa sorting purposes
        })
      });

      alert("Task marked as finished!");
      e.target.disabled = true;
      e.target.innerText = "Done";
      e.target.style.background = "#ccc";
      
    } catch (error) {
      console.error("Error updating task: ", error);
      alert("Something went wrong.");
    }
  }
});

    // dropdown toggle
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isShown = dropdownMenu.classList.toggle("show");
      menuBtn.setAttribute("aria-expanded", isShown ? "true" : "false");
      dropdownMenu.setAttribute("aria-hidden", isShown ? "false" : "true");
    });

    // close when click outside
    document.addEventListener("click", (e) => {
      if (!dropdownMenu.contains(e.target) && !menuBtn.contains(e.target)) {
        dropdownMenu.classList.remove("show");
        menuBtn.setAttribute("aria-expanded", "false");
        dropdownMenu.setAttribute("aria-hidden", "true");
      }
    });

    function renderTodos(todos = []) {
  todoList.innerHTML = "";
  todos.forEach((t, index) => {
    const div = document.createElement("div");
    div.className = "todo-item" + (t.done ? " completed" : "");
    div.innerHTML = `
      <input type="checkbox" ${t.done ? "checked" : ""}>
      <span>${t.text}</span>
    `;

    const checkbox = div.querySelector("input");
    checkbox.addEventListener("change", () => {
      t.done = checkbox.checked;
      div.classList.toggle("completed", t.done);
    });

    todoList.appendChild(div);
  });
}


async function openTaskPanel(key, displayDate, data = null) {
  selectedDateKey = key;
  taskPanel.classList.add("open");
  taskPanel.setAttribute("aria-hidden", "false");
  selectedDateEl.textContent = displayDate;

  const viewMode = document.getElementById("viewMode");
  const addMode = document.getElementById("addMode");
  const taskListContainer = document.getElementById("taskListContainer");

  viewMode.style.display = "block";
  addMode.style.display = "none";
  taskListContainer.innerHTML = "";

  // 1. Kunin muna ang Class Data para malaman kung sino ang Teacher (Creator)
  const classRef = doc(db, "classes", classCode);
  const classSnap = await getDoc(classRef);
  const classOwnerEmail = classSnap.exists() ? classSnap.data().createdByEmail : "";
  
  // 2. I-check kung ang kasalukuyang user ay ang Teacher
  const isTeacher = currentUser && currentUser.email === classOwnerEmail;

  if (data && Array.isArray(data) && data.length > 0) {
    data.forEach(task => {
      const taskDiv = document.createElement("div");
      taskDiv.className = "task-item-card";
      taskDiv.style = "background:#f9f9f9; padding:12px; border-radius:10px; margin-bottom:10px; border-left:4px solid var(--accent1); cursor:pointer;";
      
      taskDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:var(--accent1); font-size:15px;">${task.title}</strong>
          <i class="fas fa-chevron-down" style="font-size:12px; color:#ccc;"></i>
        </div>
        <div class="task-details" style="display:none; margin-top:10px; font-size:14px; color:#555; border-top:1px solid #eee; padding-top:10px;">
          ${task.description || "No description provided."}
          
          <div style="margin-top:15px; display:flex; flex-direction:column; gap:8px;">
            ${!isTeacher ? `
              <button class="mark-done-btn" data-id="${task.id}" style="padding:8px; border-radius:6px; border:none; background:var(--accent2); color:white; cursor:pointer;">
                Mark as Finished
              </button>
            ` : ''}
            
            <a href="#" class="view-finished-link" data-id="${task.id}" style="font-size:12px; color:var(--accent1); text-decoration:underline;">
              View students who finished this
            </a>
          </div>
          <div style="font-size:10px; color:#aaa; margin-top:8px;">By: ${task.createdByEmail || 'Unknown'}</div>
        </div>
      `;
      async function showFinishedStudents(taskId) {
  studentModal.classList.add("active");
  const studentListContainer = document.getElementById("studentList"); 
  studentListContainer.innerHTML = "<li>Loading...</li>";

  try {
    const finishedRef = collection(db, "classes", classCode, "tasks", taskId, "finished");
    const snap = await getDocs(finishedRef);

    if (snap.empty) {
      studentListContainer.innerHTML = "<li style='list-style:none; padding:20px;'>No students finished yet.</li>";
      return;
    }

    let tableHTML = `
      <table style="width:100%; border-collapse: collapse; margin-top:10px; text-align: left;">
        <thead>
          <tr style="border-bottom: 2px solid var(--accent2); color: var(--accent2); font-size: 14px;">
            <th style="padding: 10px;">Student Email</th>
            <th style="padding: 10px; text-align: right;">Time Finished</th>
          </tr>
        </thead>
        <tbody>
    `;

    snap.forEach(doc => {
      const data = doc.data();
      const email = data.email || "Unknown Student";
      // Kunin ang time, kung wala pang 'time' field, gagamitin ang 'finishedAt' timestamp
      const time = data.time || (data.finishedAt ? new Date(data.finishedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "---");

      tableHTML += `
        <tr style="border-bottom: 1px solid #eee; font-size: 13px;">
          <td style="padding: 10px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-check-circle" style="color: green;"></i>
            <span>${email}</span>
          </td>
          <td style="padding: 10px; text-align: right; color: #666; font-weight: 600;">
            ${time}
          </td>
        </tr>
      `;
    });

    tableHTML += `</tbody></table>`;
    studentListContainer.innerHTML = tableHTML;

  } catch (e) {
    console.error("Error loading finished students:", e);
    studentListContainer.innerHTML = "<li>Error loading list.</li>";
  }
}

      // Accordion Toggle
      taskDiv.addEventListener("click", (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
        const details = taskDiv.querySelector(".task-details");
        const icon = taskDiv.querySelector("i");
        const isHidden = details.style.display === "none";
        details.style.display = isHidden ? "block" : "none";
        icon.className = isHidden ? "fas fa-chevron-up" : "fas fa-chevron-down";
      });

      // Mark as Finished Logic (IF NOT TEACHER)
      if (!isTeacher) {
        const currentDoneBtn = taskDiv.querySelector(".mark-done-btn");
        const checkStatus = async () => {
          if (!currentUser) return;
          const finishedRef = doc(db, "classes", classCode, "tasks", task.id, "finished", currentUser.uid);
          const snap = await getDoc(finishedRef);
          if (snap.exists()) {
            currentDoneBtn.disabled = true;
            currentDoneBtn.innerText = "Completed ✓";
            currentDoneBtn.style.background = "#ccc";
            currentDoneBtn.style.cursor = "default";
          }
        };
        checkStatus();

        currentDoneBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          currentDoneBtn.disabled = true;
          try {
            const finishedDocRef = doc(db, "classes", classCode, "tasks", task.id, "finished", currentUser.uid);
            await setDoc(finishedDocRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              finishedAt: new Date()
            });
            currentDoneBtn.innerText = "Completed ✓";
            currentDoneBtn.style.background = "#ccc";
          } catch (err) {
            console.error(err);
            currentDoneBtn.disabled = false;
          }
        });
      }

      // View Students Logic
      const viewLink = taskDiv.querySelector(".view-finished-link");
      viewLink.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showFinishedStudents(task.id); 
      });

      taskListContainer.appendChild(taskDiv);
    });
  
  } else {
    // Empty State
    taskListContainer.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:#999;">
        <i class="fas fa-calendar-day" style="font-size:40px; margin-bottom:10px; opacity:0.3;"></i>
        <p>No tasks scheduled for this day.</p>
      </div>
    `;
  }

  // Permissions check
  const canEdit = currentUser && classDoc && (classDoc.createdBy === currentUser.uid);
  if (addTaskBtn) addTaskBtn.style.display = canEdit ? "flex" : "none";
}

    // firestore & auth
    onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = "login.html"; return; }
      currentUser = user;

      try {
        const classRef = doc(db, "classes", classCode);
        const classSnap = await getDoc(classRef);
        if (!classSnap.exists()) {
          alert("Class not found. It may have been deleted.");
          window.location.href = "index.html";
          return;
        }
        classDoc = classSnap.data();
        classTitleEl.textContent = classDoc.name || "Class";
        classSubjectEl.textContent = `${classDoc.subject || ""} — ${classDoc.section || ""}`;
        classCodeLabel.textContent = `Code: ${classDoc.code || classCode}`;

        // only show delete for creator
        if (classDoc.createdBy === currentUser.uid) {
          deleteClassBtn.style.display = "block";
        } else {
          deleteClassBtn.style.display = "none";
        }

        if (unsubscribeTasks) unsubscribeTasks();
        unsubscribeTasks = onSnapshot(collection(db, "classes", classCode, "tasks"), (snap) => {
          tasks = {};
          snap.forEach(s => {
            const d = s.data();
        if (!tasks[d.date]) {
          tasks[d.date] = [];
        }
        tasks[d.date].push({ id: s.id, ...d });

          });
          generateCalendar(currentMonth, currentYear);
        });

      } catch (err) {
        console.error("Load class error:", err);
        alert("Failed to load class.");
      }
    });

    saveTaskBtn.addEventListener("click", async () => {
  if (!currentUser || !classDoc) return;

  const title = taskTitle.value.trim();
  const desc = taskDescription.value.trim(); // Siguraduhin na tama ang ID nito (taskDescription o taskDesc)

  if (!title) return alert("Enter a title.");
  saveTaskBtn.disabled = true;

  try {
    const taskId = saveTaskBtn.dataset.taskId;
    const tasksCol = collection(db, "classes", classCode, "tasks");

    const payload = {
      date: selectedDateKey,
      title: title,
      description: desc,
      updatedAt: new Date(),
      createdBy: currentUser.uid,
      createdByEmail: currentUser.email || ""
    };

    if (taskId) {
      // UPDATE: Kung nage-edit ng existing task
      const taskRef = doc(db, "classes", classCode, "tasks", taskId);
      await updateDoc(taskRef, payload);
    } else {
      // ADD NEW: Gagawa ng bagong document (para makarami ng task sa isang araw)
      payload.createdAt = new Date();
      await addDoc(tasksCol, payload);
    }

    // RESET: I-clear ang form at bumalik sa list view
    taskTitle.value = "";
    taskDescription.value = "";
    document.getElementById("addMode").style.display = "none";
    document.getElementById("viewMode").style.display = "block";
    
    // Hindi na kailangang isara ang panel para makapag-add ulit agad
  } catch (err) {
    console.error("Save task error:", err);
    alert("Failed to save task.");
  }
  saveTaskBtn.disabled = false;
});


  

    // Prev/Next month
    document.getElementById("prev").addEventListener("click", () => { currentMonth--; if (currentMonth<0){ currentMonth=11; currentYear--; } generateCalendar(currentMonth,currentYear); });
    document.getElementById("next").addEventListener("click", () => { currentMonth++; if (currentMonth>11){ currentMonth=0; currentYear++; } generateCalendar(currentMonth,currentYear); });

    // ---- Leave / Delete flows using the single modal overlay ----
    function showModal({title, text, confirmText="Confirm", onConfirm}) {
      modalTitle.textContent = title;
      modalText.textContent = text;
      modalConfirm.textContent = confirmText;
      overlay.classList.add("show");
      overlay.setAttribute("aria-hidden", "false");

      function cleanup() {
        overlay.classList.remove("show");
        overlay.setAttribute("aria-hidden", "true");
        modalCancel.removeEventListener("click", onCancel);
        modalConfirm.removeEventListener("click", onOk);
        document.removeEventListener("keydown", onEsc);
      }
      function onCancel(e){ e?.preventDefault?.(); cleanup(); }
      async function onOk(e){ e?.preventDefault?.(); cleanup(); await onConfirm(); }
      function onEsc(e){ if (e.key === "Escape") onCancel(); }

      modalCancel.addEventListener("click", onCancel);
      modalConfirm.addEventListener("click", onOk);
      document.addEventListener("keydown", onEsc);
    }

    // Leave class (remove joinedClasses and own classes entries)
    leaveClassBtn.addEventListener("click", (e) => {
      e.preventDefault();
      dropdownMenu.classList.remove("show");
      showModal({
        title: "Leave this class?",
        text: "If you leave this class you will lose access to its tasks and schedule. This action can be undone by joining again.",
        confirmText: "Leave Class",
        onConfirm: async () => {
          try {
            // remove from users/{uid}/joinedClasses (any docs with code)
            const joinedCol = collection(db, "users", currentUser.uid, "joinedClasses");
            const q = query(joinedCol, where("code", "==", classCode));
            const snaps = await getDocs(q);
            for (const s of snaps.docs) {
              await deleteDoc(doc(db, "users", currentUser.uid, "joinedClasses", s.id));
            }

            // also remove from users/{uid}/classes if teacher saved it
            const ownCol = collection(db, "users", currentUser.uid, "classes");
            const q2 = query(ownCol, where("code", "==", classCode));
            const snaps2 = await getDocs(q2);
            for (const s of snaps2.docs) {
              await deleteDoc(doc(db, "users", currentUser.uid, "classes", s.id));
            }

            // show inline confirmation then redirect
            const msg = document.createElement("div");
            msg.textContent = "You have left the class.";
            Object.assign(msg.style, {
              position: "fixed", top: "18px", left:"50%", transform:"translateX(-50%)",
              background:"linear-gradient(to right, var(--accent1), var(--accent2))", color:"#fff",
              padding:"10px 16px", borderRadius:"10px", zIndex:9999, fontWeight:700, boxShadow:"0 6px 20px rgba(0,0,0,.25)"
            });
            document.body.appendChild(msg);
            setTimeout(()=> { msg.style.transition="opacity .5s"; msg.style.opacity="0"; setTimeout(()=>{ msg.remove(); window.location.href="index.html"; },500); },1400);

          } catch (err) {
            console.error("Leave error:", err);
            alert("Failed to leave. Try again.");
          }
        }
      });
    });

    // Delete (creator) -- permanent removal of class doc and its tasks
    deleteClassBtn.addEventListener("click", (e) => {
      e.preventDefault();
      dropdownMenu.classList.remove("show");
      showModal({
        title: "Delete class?",
        text: "This will permanently delete the class and all its tasks for everyone. This cannot be undone.",
        confirmText: "Delete Class",
        onConfirm: async () => {
          try {
            // delete class tasks then class doc
            const tasksColRef = collection(db, "classes", classCode, "tasks");
            const snaps = await getDocs(tasksColRef);
            for (const s of snaps.docs) {
              await deleteDoc(doc(db, "classes", classCode, "tasks", s.id));
            }
            // delete class doc
            await deleteDoc(doc(db, "classes", classCode));

           
            try {
              const ownCol = collection(db, "users", currentUser.uid, "classes");
              const q2 = query(ownCol, where("code","==", classCode));
              const snaps2 = await getDocs(q2);
              for (const s of snaps2.docs) {
                await deleteDoc(doc(db, "users", currentUser.uid, "classes", s.id));
              }
            } catch(e){ /* ignore */ }

            const msg = document.createElement("div");
            msg.textContent = "Class deleted.";
            Object.assign(msg.style, {
              position: "fixed", top: "18px", left:"50%", transform:"translateX(-50%)",
              background:"#222", color:"#fff",
              padding:"10px 16px", borderRadius:"10px", zIndex:9999, fontWeight:700
            });
            document.body.appendChild(msg);
            setTimeout(()=> { msg.style.transition="opacity .5s"; msg.style.opacity="0"; setTimeout(()=>{ msg.remove(); window.location.href="index.html"; },500); },1200);

          } catch (err) {
            console.error("Delete error:", err);
            alert("Failed to delete class. Try again.");
          }
        }
      });
    }); 
    
   // ===== View Students Modal =====  
const viewStudentsBtn = document.getElementById("viewStudents");
const studentModal = document.createElement("div");
studentModal.classList.add("student-modal");
studentModal.innerHTML = `
  <div class="student-modal-content">
    <h3>Student List</h3>
    <ul id="studentList"></ul>
    <button id="closeStudentModal">Close</button>
  </div>
`;
document.body.appendChild(studentModal);

viewStudentsBtn?.addEventListener("click", async () => {
  studentModal.classList.add("active");
  dropdownMenu.classList.remove("show");
  const studentList = document.getElementById("studentList");
  studentList.innerHTML = "<li>Loading...</li>";

  try {
    // 1. Reference the subcollection seen in your screenshot
    const studentsRef = collection(db, "classes", classCode, "students");
    const snap = await getDocs(studentsRef);

    if (snap.empty) {
      studentList.innerHTML = "<li>No students found. Have someone join using the code!</li>";
      return;
    }

    const items = [];
    snap.forEach(doc => {
      const data = doc.data();
      // 2. Display Email if Name is missing
      const displayName = data.name && data.name !== "Unnamed Student" ? data.name : data.email;
      
      items.push(`
        <li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
          <i class="fas fa-user-circle" style="color: var(--accent2);"></i>
          <span>${displayName || "Anonymous User"}</span>
        </li>
      `);
    });

    studentList.innerHTML = items.join("");
  } catch (e) {
    console.error("Error:", e);
    studentList.innerHTML = "<li>Error loading list. Check console.</li>";
  }
});


document.getElementById("closeStudentModal").addEventListener("click", () => {
  studentModal.classList.remove("active");
});
studentModal.addEventListener("click", (e) => {
  if (e.target === studentModal) studentModal.classList.remove("active");
});




    // initial calendar render
    generateCalendar(currentMonth, currentYear);


function closeTaskPanel() {
  // Alisin ang 'open' class para gumanang slide out animation
  taskPanel.classList.remove("open");
  taskPanel.setAttribute("aria-hidden", "true");
  
  // I-reset ang state
  selectedDateKey = null;
  if (saveTaskBtn.dataset) {
    delete saveTaskBtn.dataset.taskId;
  }
}

// Siguraduhin na ang 'closeTask' variable ay may access sa element
const closeTaskBtn = document.getElementById("closeTask");

if (closeTaskBtn) {
  closeTaskBtn.addEventListener("click", (e) => {
    e.preventDefault();
    console.log("X button was clicked!"); // Lalabas ito sa F12 Console kapag gumana
    closeTaskPanel();
  });
}