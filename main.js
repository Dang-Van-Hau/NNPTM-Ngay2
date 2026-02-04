const POSTS_URL = "http://localhost:3000/posts";
const CMTS_URL  = "http://localhost:3000/comments";

/* =========================
   HELPERS
========================= */
function toNumberOrKeep(value) {
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

function getMaxIdAsNumber(items) {
  // ID là chuỗi trong db -> parseInt để lấy max
  let max = 0;
  for (const it of items) {
    const num = parseInt(it.id, 10);
    if (!Number.isNaN(num) && num > max) max = num;
  }
  return max;
}

/* =========================
   POSTS: READ + RENDER
========================= */
async function LoadPosts() {
  const res = await fetch(POSTS_URL);
  const posts = await res.json();

  const tbody = document.getElementById("post_tbody");
  tbody.innerHTML = "";

  for (const p of posts) {
    const rowClass = p.isDeleted ? "deleted" : "";
    tbody.innerHTML += `
      <tr class="${rowClass}">
        <td>${p.id}</td>
        <td>${p.title ?? ""}</td>
        <td>${p.views ?? ""}</td>
        <td>${p.isDeleted ? "true" : "false"}</td>
        <td class="row-actions">
          <button onclick="FillPostForm('${p.id}')">Edit</button>
          ${p.isDeleted
            ? `<button onclick="RestorePost('${p.id}')">Restore</button>`
            : `<button onclick="SoftDeletePost('${p.id}')">Soft Delete</button>`
          }
        </td>
      </tr>
    `;
  }
}

async function FillPostForm(id) {
  const res = await fetch(`${POSTS_URL}/${id}`);
  if (!res.ok) return alert("Post not found!");
  const p = await res.json();

  // ID input disabled (theo yêu cầu: tạo mới bỏ trống id, update theo record đang chọn)
  document.getElementById("post_id").value = p.id;
  document.getElementById("post_title").value = p.title ?? "";
  document.getElementById("post_views").value = p.views ?? "";
}

function ClearPostForm() {
  document.getElementById("post_id").value = "";
  document.getElementById("post_title").value = "";
  document.getElementById("post_views").value = "";
}

/* =========================
   POSTS: CREATE/UPDATE
   - Create: ID = maxId + 1 (string)
   - Create when "post_id" is empty
========================= */
async function SavePost() {
  const idField = document.getElementById("post_id").value.trim(); // nếu có -> UPDATE
  const title = document.getElementById("post_title").value.trim();
  const viewsRaw = document.getElementById("post_views").value.trim();

  if (!title) return alert("Please enter title!");

  const views = toNumberOrKeep(viewsRaw);

  // UPDATE
  if (idField) {
    // Lấy post hiện tại để giữ nguyên isDeleted (nếu có)
    const currentRes = await fetch(`${POSTS_URL}/${idField}`);
    if (!currentRes.ok) return alert("Post not found for update!");
    const current = await currentRes.json();

    const res = await fetch(`${POSTS_URL}/${idField}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: String(idField),              // ID luôn là chuỗi
        title,
        views,
        isDeleted: Boolean(current.isDeleted) // giữ trạng thái xóa mềm
      })
    });

    if (!res.ok) return alert("Update failed!");
    ClearPostForm();
    await LoadPosts();
    return;
  }

  // CREATE (id trống)
  const allRes = await fetch(POSTS_URL);
  const allPosts = await allRes.json();
  const maxId = getMaxIdAsNumber(allPosts);
  const newId = String(maxId + 1); // ID lưu CSDL là chuỗi

  const res = await fetch(POSTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: newId,
      title,
      views,
      isDeleted: false
    })
  });

  if (!res.ok) return alert("Create failed!");
  ClearPostForm();
  await LoadPosts();
}

/* =========================
   POSTS: SOFT DELETE / RESTORE
   - Soft delete: PATCH isDeleted:true
   - Restore: PATCH isDeleted:false
========================= */
async function SoftDeletePost(id) {
  const res = await fetch(`${POSTS_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isDeleted: true })
  });

  if (!res.ok) return alert("Soft delete failed!");
  await LoadPosts();
}

async function RestorePost(id) {
  const res = await fetch(`${POSTS_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isDeleted: false })
  });

  if (!res.ok) return alert("Restore failed!");
  await LoadPosts();
}

/* =========================
   COMMENTS: READ + RENDER
========================= */
async function LoadComments() {
  const res = await fetch(CMTS_URL);
  const cmts = await res.json();

  const tbody = document.getElementById("cmt_tbody");
  tbody.innerHTML = "";

  for (const c of cmts) {
    tbody.innerHTML += `
      <tr>
        <td>${c.id}</td>
        <td>${c.postId ?? ""}</td>
        <td>${c.text ?? ""}</td>
        <td class="row-actions">
          <button onclick="FillCommentForm('${c.id}')">Edit</button>
          <button onclick="DeleteComment('${c.id}')">Delete</button>
        </td>
      </tr>
    `;
  }
}

async function FillCommentForm(id) {
  const res = await fetch(`${CMTS_URL}/${id}`);
  if (!res.ok) return alert("Comment not found!");
  const c = await res.json();

  document.getElementById("cmt_id").value = c.id;
  document.getElementById("cmt_postId").value = c.postId ?? "";
  document.getElementById("cmt_text").value = c.text ?? "";
}

function ClearCommentForm() {
  document.getElementById("cmt_id").value = "";
  document.getElementById("cmt_postId").value = "";
  document.getElementById("cmt_text").value = "";
}

/* =========================
   COMMENTS: CREATE/UPDATE/DELETE
   - Create: ID = maxId + 1 (string), khi id trống
========================= */
async function SaveComment() {
  const idField = document.getElementById("cmt_id").value.trim(); // có -> UPDATE
  const postId = document.getElementById("cmt_postId").value.trim(); // string
  const text = document.getElementById("cmt_text").value.trim();

  if (!postId) return alert("Please enter postId!");
  if (!text) return alert("Please enter comment text!");

  // UPDATE
  if (idField) {
    const res = await fetch(`${CMTS_URL}/${idField}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: String(idField),
        postId: String(postId),
        text
      })
    });

    if (!res.ok) return alert("Update comment failed!");
    ClearCommentForm();
    await LoadComments();
    return;
  }

  // CREATE (id trống)
  const allRes = await fetch(CMTS_URL);
  const allCmts = await allRes.json();
  const maxId = getMaxIdAsNumber(allCmts);
  const newId = String(maxId + 1);

  const res = await fetch(CMTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: newId,
      postId: String(postId),
      text
    })
  });

  if (!res.ok) return alert("Create comment failed!");
  ClearCommentForm();
  await LoadComments();
}

async function DeleteComment(id) {
  const res = await fetch(`${CMTS_URL}/${id}`, { method: "DELETE" });
  if (!res.ok) return alert("Delete comment failed!");
  await LoadComments();
}

/* =========================
   INIT
========================= */
LoadPosts();
LoadComments();
