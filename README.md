# Drive Cleanup Kit

**See who can open your Google Drive files, take access back, and clear out duplicates and empty files, all from a Google Sheet you own.**

[العربية](README.ar.md)

It is a Google Apps Script project that lives in one spreadsheet. Nothing is sent anywhere: the script runs in your own Google account and writes its results into tabs of that spreadsheet. Every step that changes Drive works only on rows you have ticked.

## Why it exists

I built it to clean up the Drive of a small agency that had been running for five years. Freelancers, ex-staff and clients still had access to thousands of files: about 3,000 shared items, 91 people with access, and 167 files that *anyone with the link could edit*. Drive's own interface only lets you fix that one file at a time, and its search results are capped, so the job needed a script.

It worked: 99% of the shared items ended up clean, and 1.7 GB of exact duplicates went to the trash. This repository is the general version of that script, with the company-specific parts taken out.

## What it does

The script adds a **Drive Cleanup** menu to the sheet:

| Step | Changes Drive? | What it does |
|---|---|---|
| 1 · Scan sharing | No | Lists every item you own that someone else can open, every public link, every person with access, and items inside your Drive that someone else owns. |
| 2 · Build sharing plan | No | Compares the scan with your **keep list** and writes a plan: who loses access to what, and which public links change. Every row has a tick box. |
| 3 · Apply ticked sharing changes | **Yes** | Applies the ticked rows, parent folders first, and writes a status line for each one. |
| 4 · Find clean-up candidates | No | Finds exact duplicates, empty folders, empty files and large files that you own. |
| 5 · Move ticked items to trash | **Yes** | Moves the ticked items to Drive's trash, where you can restore them for 30 days. |

## Safety

- Steps 1, 2 and 4 only read. Steps 3 and 5 ask for confirmation first and act only on ticked rows.
- Nothing is ever deleted for good. Clean-up moves items to the trash, where they stay restorable for 30 days.
- The owner of a file is never removed. You are never removed.
- Before an item goes to the trash, the script checks it again. You must still own it, and a folder must still be empty.
- If you tick every copy of a duplicate, the oldest copy is kept.
- A Google Doc, Sheet or Slides file is called empty only after the script opens it and finds no content. If it cannot open the file, the file is not listed.
- Large files are listed for you to judge. They are never ticked for you.

## Set up (about 3 minutes, no tools needed)

1. Create a new Google Sheet. Then open **Extensions → Apps Script**.
2. In the Apps Script editor, open **Project Settings** (the gear icon). Tick **Show "appsscript.json" manifest file in editor**.
3. Replace the contents of `appsscript.json` with [`src/appsscript.json`](src/appsscript.json). This turns on the Drive API v3 advanced service.
4. Create one script file for each `.gs` file in [`src/`](src). Use the same names, and paste in each file's contents.
5. Save, go back to the sheet and reload it. Then use the **Drive Cleanup** menu.
6. The first time you run a step, Google asks you to authorise the script. It shows *"Google hasn't verified this app"*, because the script is your own copy and not a published app. Click **Advanced → Go to (project name)**.

If you use [clasp](https://github.com/google/clasp), you can do it from the command line instead:

```bash
clasp create --type sheets --title "Drive Cleanup Kit" --rootDir src
```

```bash
clasp push
```

## Settings

All settings are in the **Settings · الإعدادات** tab:

| Setting | Values | Meaning |
|---|---|---|
| Language | `en` / `ar` | The language of the menu, tabs and messages. Choose it before the first scan. |
| Public edit links | `keep` / `view` / `remove` | What happens to "anyone with the link" sharing. `view` turns edit links into view-only links. `remove` removes every public link. |
| Large file (MB) | number | Files bigger than this are listed in step 4. |
| People to keep | email + optional folder link | The people who keep their access. Leave the folder empty to keep someone everywhere. Add a folder link to keep them only inside that folder and the folders below it. One example is a client who should see their own client folder and nothing else. |

Anyone with access who is **not** on the keep list appears in the plan, and you decide row by row. If the keep list is empty, the plan removes everyone except you, and the script warns you.

## Big drives

Apps Script stops any run after 6 minutes. Each long step stops itself after 4.5 minutes and saves its progress. It then schedules a time-driven trigger that carries on a minute later, until the job is done. The **Status** cell in the Settings tab shows where it is, and you can close the sheet in the meantime. **Stop and reset** cancels any pending continuation.

## What I learned about Drive sharing

- **Access is inherited.** Someone who can open a folder can open everything inside it. You cannot remove that inherited access from a file inside the folder; Drive returns an error. Remove it from the folder instead. So the plan is sorted with top folders first, and most files are already clean by the time their turn comes.
- **Folders owned by someone else are traps.** If your file sits inside a folder that someone else owns, everyone on that folder can still see your file, and you cannot change that folder. The fix is to move your file out, into a folder you own. The script marks these cases in the status column but does not move anything for you.
- **Duplicates are easy to prove.** Uploaded files have an MD5 checksum and a size, and two files with the same checksum and size are the same file. Google Docs, Sheets and Slides files have neither, so they are never reported as duplicates.
- **"Shared with me" is not "in my Drive".** Files shared with you only count as part of your Drive once someone has added them to one of your folders. The scan follows each file's parent folders up to your Drive's root to tell them apart.

## Limits

- **My Drive only.** Shared drives have different rules for permissions and are not scanned.
- **No ownership transfers.** Files that other people own are listed in the scan, but nothing is done to them.
- **Access that comes from a folder you do not own** cannot be removed by the script. The status column tells you where it comes from.
- **The empty-file check opens at most 300** untitled or untouched Google files per run.

## Permissions it asks for

| Scope | Why |
|---|---|
| See, edit and delete all your Google Drive files | Read sharing settings, change them (step 3), and move items to the trash (step 5). |
| Google Docs, Sheets and Slides | Open untitled files to check that they really are empty (step 4). |
| Run when you are not present | The time-driven trigger that continues long steps. |
| Show dialogs in Google Sheets | The menu, toasts and confirmations. |

## Tests

The whole flow runs in Node against an in-memory fake Drive, in both languages. The fake clock forces every long step to stop and carry on in a new run.

```bash
npm test
```

## Licence

[MIT](LICENSE). Made by Khaled Bzmawe.
