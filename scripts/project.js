"use strict";
const languageURL = 'https://cs.appstate.edu/jas/3440/project/data_language.json';
const projectURL = 'https://cs.appstate.edu/jas/3440/project/data_projects.json';
const studyAbroadURL = 'https://cs.appstate.edu/jas/3440/project/data_study_abroad.json';

const ALL = "";
const LEVELS = { low: 1, med: 2, medium: 2, high: 3 };

let languageData = [];
let projectData = [];
let studyData = [];

// ---------- helpers ----------

const norm = (v) => String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();

function displayCase(variants) {
    const mixed = variants.find((v) => v !== v.toUpperCase() && v !== v.toLowerCase());
    if (mixed) return mixed;
    const v = variants[0];
    if (v === v.toUpperCase() && v.length <= 5 && !v.includes(" ")) return v;
    return v.toLowerCase().replace(/(^|[\s(\-/])([a-z])/g, (m, p, c) => p + c.toUpperCase());
}

// Unique values (case-insensitive) as [{value: normalized key, label}], sorted by label.
function uniqueOptions(values) {
    const map = new Map();
    values.forEach((raw) => {
        const clean = String(raw ?? "").trim().replace(/\s+/g, " ");
        if (!clean) return;
        const key = clean.toLowerCase();
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(clean);
    });
    return [...map.entries()]
        .map(([value, variants]) => ({ value, label: displayCase(variants) }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

function fillSelect(id, values, allLabel) {
    const select = document.querySelector(id);
    select.innerHTML = "";
    select.appendChild(new Option(allLabel, ALL));
    uniqueOptions(values).forEach((o) => select.appendChild(new Option(o.label, o.value)));
}

// "BUS / MBA" -> ["BUS", "MBA"]
const splitDepartments = (d) => String(d ?? "").split("/").map((x) => x.trim()).filter(Boolean);

const fullName = (item) => `${String(item.Firstname ?? "").trim()} ${String(item.Lastname ?? "").trim()}`.trim();

function projectDescription(item) {
    const parts = [item.Country, item.Collaboration, item.Location]
        .map((p) => String(p ?? "").trim())
        .filter(Boolean);
    return parts.join(" – ");
}

function getTable(header, rows) {
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    header.forEach((h) => {
        const th = document.createElement("th");
        th.textContent = h;
        tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
        const r = document.createElement("tr");
        row.forEach((cell) => {
            const td = document.createElement("td");
            td.textContent = cell;
            r.appendChild(td);
        });
        tbody.appendChild(r);
    });
    table.appendChild(tbody);
    return table;
}

function show(containerId, header, rows) {
    const container = document.querySelector(containerId);
    container.innerHTML = "";
    if (rows.length === 0) {
        const p = document.createElement("p");
        p.textContent = "No results match your search.";
        container.appendChild(p);
        return;
    }
    container.appendChild(getTable(header, rows));
}

async function load(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return response.json();
}

function showError(containerId, error) {
    console.error(error);
    document.querySelector(containerId).textContent = "Unable to load data.";
}

// Tables stay hidden until the user touches a control in that section.
function wire(controlIds, handler) {
    controlIds.forEach((id) => {
        const el = document.querySelector(id);
        el.addEventListener(el.tagName === "SELECT" ? "change" : "input", handler);
    });
}

// ---------- 1. language ----------

function updateLanguage() {
    const lang = document.querySelector("#lang-select").value;
    const level = LEVELS[document.querySelector("#prof-select").value] || 1;
    const name = norm(document.querySelector("#lang-name").value);

    const rows = languageData
        .filter((i) => !lang || norm(i.Language) === lang)
        .filter((i) => (LEVELS[norm(i.Proficiency)] || 0) >= level)
        .filter((i) => !name || norm(fullName(i)).includes(name))
        .map((i) => [fullName(i), String(i.Language).trim(), String(i.Proficiency).trim()]);
    show("#language", ["Name", "Language", "Level of Proficiency"], rows);
}

async function getLanguage() {
    try {
        languageData = await load(languageURL);
        fillSelect("#lang-select", languageData.map((i) => i.Language), "All");
        wire(["#lang-select", "#prof-select", "#lang-name"], updateLanguage);
    } catch (error) {
        showError("#language", error);
    }
}

// ---------- 2. projects ----------

function updateProjects() {
    const name = norm(document.querySelector("#proj-name").value);
    const desc = norm(document.querySelector("#proj-desc").value);
    const college = document.querySelector("#college-select").value;
    const dept = document.querySelector("#dept-select").value;
    const country = document.querySelector("#country-select").value;

    const rows = projectData
        .filter((i) => !college || norm(i.AcademicCollege) === college)
        .filter((i) => !dept || norm(i.AcademicDepartment) === dept)
        .filter((i) => !country || norm(i.Country) === country)
        .filter((i) => !name || norm(fullName(i)).includes(name))
        .filter((i) => !desc || norm(projectDescription(i)).includes(desc))
        .map((i) => [
            fullName(i),
            String(i.AcademicDepartment).trim(),
            String(i.AcademicCollege).trim(),
            String(i.Country).trim(),
            /^y/i.test(String(i.Travelled).trim()) ? "Y" : "N",
            projectDescription(i),
        ]);
    show("#project", ["Name", "Department", "College", "Country", "Travelled (Y/N)", "Project Description"], rows);
}

async function getProjects() {
    try {
        projectData = await load(projectURL);
        fillSelect("#college-select", projectData.map((i) => i.AcademicCollege), "All");
        fillSelect("#dept-select", projectData.map((i) => i.AcademicDepartment), "All");
        fillSelect("#country-select", projectData.map((i) => i.Country), "All");
        wire(["#proj-name", "#proj-desc", "#college-select", "#dept-select", "#country-select"], updateProjects);
    } catch (error) {
        showError("#project", error);
    }
}

// ---------- 3. study abroad ----------

function updateStudyAbroad() {
    const term = document.querySelector("#term-select").value;
    const prog = document.querySelector("#prog-select").value;
    const country = document.querySelector("#study-country-select").value;
    const dept = document.querySelector("#study-dept-select").value;
    const dates = document.querySelector("#date-select").value;

    const rows = studyData
        .filter((i) => !term || norm(i.Term) === term)
        .filter((i) => !prog || norm(i.ProgramName) === prog)
        .filter((i) => !country || norm(i.Countries) === country)
        .filter((i) => !dept || splitDepartments(i.Department).some((d) => norm(d) === dept))
        .filter((i) => !dates || norm(i.Dates) === dates)
        .map((i) => [
            String(i.Term).trim(),
            String(i.ProgramName).trim(),
            String(i.Countries).trim(),
            String(i.College).trim(),
            String(i.Department).trim(),
            String(i.Dates).trim(),
            String(i.Level).trim(),
            String(i.Credits).trim(),
        ]);
    show("#study_abroad", ["Term", "Program Name", "Country", "College", "Dept.", "Dates", "Level", "Credits Avail."], rows);
}

async function getStudyAbroad() {
    try {
        studyData = await load(studyAbroadURL);
        fillSelect("#term-select", studyData.map((i) => i.Term), "All");
        fillSelect("#prog-select", studyData.map((i) => i.ProgramName), "All");
        fillSelect("#study-country-select", studyData.map((i) => i.Countries), "All");
        fillSelect("#study-dept-select", studyData.flatMap((i) => splitDepartments(i.Department)), "All");
        fillSelect("#date-select", studyData.map((i) => i.Dates), "All");
        wire(["#term-select", "#prog-select", "#study-country-select", "#study-dept-select", "#date-select"], updateStudyAbroad);
    } catch (error) {
        showError("#study_abroad", error);
    }
}

function start() {
    getLanguage();
    getProjects();
    getStudyAbroad();
}

start();
