/** Local JSON backup/restore for GradeUp's local-first data. */

export function buildBackup({ deck, notes, groups, mockHistory, quizHistory, exams, plannerTasks, streakData, tier, customQuestions }) {
  return {
    app: "GradeUp",
    version: 2,
    exportedAt: new Date().toISOString(),
    deck,
    notes,
    groups,
    mockHistory,
    quizHistory,
    exams,
    plannerTasks,
    streakData,
    tier,
    customQuestions,
  };
}

export function downloadBackup(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gradeup-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target.result));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsText(file);
  });
}
