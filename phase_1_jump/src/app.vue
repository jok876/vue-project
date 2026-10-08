<!--1. Load the records from the Web API when the application is loaded 
2. Allow users to add new record and the obtained results 
3. Display the nationality, the name and the records of a player
4. Allow users to delete items 
5. Calculate and display the best record of a player 
6. Sort the list based on nationality or the best record of players
7. Use fetch() to retrieve the table and send user actions to the server-side
8. Display error messages to inform users when things go wrong-->
<template>
  <div class="container">
    <h1>Athletics Long Jump Records</h1>

    <div v-if="errorMessage" class="error-banner">
      {{ errorMessage }}
      <button @click = "errorMessage = 'This is error message, please check.'">x</button>
    </div>

    <div class="toolbar">
      <button @click = "openAddForm">{{ showForm ? 'Cancel' : '+ Please add new record' }}</button>

      <label>Sort by:
        <select v-model = "sortKey">
          <option value = "none">Default</option>
          <option value = "nationality">Nationality</option>
          <option value = "best">Best Record</option>
        </select>
      </label>

      <label>Order:
        <select v-model = "sortOrder">
          <option value = "asc">Ascending</option>
          <option value = "desc">Descending</option>
        </select>
      </label>

      <button @click="loadRecords" :disabled = "loading">Refresh</button>
    </div>

    <div v-if="showForm" class="form-card">
      <h2>{{ editingPk === null ? 'Add New Record' : 'Edit Record #' + editingPk }}</h2>
      <form @submit.prevent = "submitForm">
        <label>Nationality: <input v-model.trim = "form.nationality" required maxlength="3" /></label>
        <label>Name: <input v-model.trim = "form.name" required maxlength="60" /></label>
        <label>1st Attempt: <input v-model.number = "form.firstAttempt" type = "number" step = "0.01" min = "0" max = "100" required /></label>
        <label>2nd Attempt: <input v-model.number = "form.secondAttempt" type = "number" step = "0.01" min = "0" max = "100" required /></label>
        <label>3rd Attempt: <input v-model.number = "form.thirdAttempt" type = "number" step = "0.01" min = "0" max = "100" required /></label>
        <button type = "submit" :disabled = "saving">{{ saving ? 'Saving...' : 'Save' }}</button>
        <button type = "button" @click = "closeForm">Cancel</button>
      </form>
    </div>

    <p v-if="loading">Loading records</p>

    <table v-else-if = "sortedRecords.length" border="1">
      <thead>
        <tr>
          <th>#</th><th>Nationality</th><th>Name</th>
          <th>1st</th><th>2nd</th><th>3rd</th><th>Best</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for = "(r, i) in sortedRecords" :key="r.pk">
          <td>{{ i + 1 }}</td>
          <td>{{ r.nationality }}</td>
          <td>{{ r.name }}</td>
          <td>{{ fmt(r.firstAttempt) }}</td>
          <td>{{ fmt(r.secondAttempt) }}</td>
          <td>{{ fmt(r.thirdAttempt) }}</td>
          <td><strong>{{ fmt(bestOf(r)) }}</strong></td>
          <td>
            <button @click="openEditForm(r)" id = "edit_button">Edit</button>
            <button @click="deleteRecord(r.pk)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>No records found.</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
//record
const API_BASE = '/api/records'
//set
const records = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const showForm = ref(false)
const editingPk = ref(null)
const sortKey = ref('none')
const sortOrder = ref('asc')

const emptyForm = () => ({
  nationality: '', name: '',
  firstAttempt: 0, secondAttempt: 0, thirdAttempt: 0
})
const form = ref(emptyForm())

function bestOf(r) {
  return Math.max(
    Number(r.firstAttempt) || 0,
    Number(r.secondAttempt) || 0,
    Number(r.thirdAttempt) || 0
  )
}

function fmt(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : '-'
}

const sortedRecords = computed(() => {
  const arr = [...records.value]
  if (sortKey.value === 'nationality') {
    arr.sort((a, b) => a.nationality.localeCompare(b.nationality))
  } else if (sortKey.value === 'best') {
    arr.sort((a, b) => bestOf(a) - bestOf(b))
  }
  if (sortOrder.value === 'desc') arr.reverse()
  return arr
})

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    })
    if (res.status === 204) return null
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status)
    return data
  } catch (err) {
    errorMessage.value = err.message || 'Network error'
    throw err
  }
}

async function loadRecords() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await apiFetch(API_BASE)
    records.value = Array.isArray(data) ? data : []
  } catch (_) {
    records.value = []
  } finally {
    loading.value = false
  }
}

function openAddForm() {
  editingPk.value = null
  form.value = emptyForm()
  showForm.value = !showForm.value
  errorMessage.value = ''
}

function openEditForm(r) {
  editingPk.value = r.pk
  form.value = {
    nationality: r.nationality, name: r.name,
    firstAttempt: r.firstAttempt,
    secondAttempt: r.secondAttempt,
    thirdAttempt: r.thirdAttempt
  }
  showForm.value = true
  errorMessage.value = ''
}

function closeForm() {
  showForm.value = false
  editingPk.value = null
  form.value = emptyForm()
}

async function submitForm() {
  saving.value = true
  errorMessage.value = ''
  try {
    if (editingPk.value === null) {
      const created = await apiFetch(API_BASE, {
        method: 'POST',
        body: JSON.stringify(form.value)
      })
      records.value.push(created)
    } else {
      const updated = await apiFetch(API_BASE + '/' + editingPk.value, {
        method: 'PUT',
        body: JSON.stringify(form.value)
      })
      const idx = records.value.findIndex(r => r.pk === editingPk.value)
      if (idx !== -1) records.value[idx] = updated
    }
    closeForm()
  } catch (_) {
  } finally {
    saving.value = false
  }
}

async function deleteRecord(pk) {
  if (!confirm('Delete this record?')) return
  errorMessage.value = ''
  try {
    await apiFetch(API_BASE + '/' + pk, { method: 'DELETE' })
    records.value = records.value.filter(r => r.pk !== pk)
  } catch (_) {}
}

onMounted(loadRecords)
</script>

<style>
.container { max-width: 1000px; margin: 2rem auto; font-family: Arial, sans-serif; }
.error-banner { background: red; color: black; padding: .6rem 1rem; border-radius: 6px; margin-bottom: 1rem; }
.toolbar { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; }
.form-card { background: whitesmoke; border: 1px solid lightcyan; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
.form-card label { display: block; margin-bottom: .5rem; }
.form-card input { padding: .3rem; margin-left: .3rem; }
#edit_button {background:brown}
table { width: 100%; border-collapse: collapse; background: white; }
th, td { padding: .5rem .7rem; text-align: left; }
th { background: darkblue; color: white; }
tr:hover { background: lightcyan; }
button { padding: .35rem .8rem; margin-right: .3rem; cursor: pointer; border: none; border-radius: 4px; background: orangered; color: white; }
button:disabled { opacity: .6; cursor: not-allowed; }
</style>