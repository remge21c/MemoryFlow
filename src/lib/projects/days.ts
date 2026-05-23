export function createProjectDayInputs(startDate: Date, endDate: Date) {
  const days = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  let dayNumber = 1;

  while (cursor <= end) {
    days.push({
      dayNumber,
      date: new Date(cursor),
      title: `Day ${dayNumber}`,
      sortOrder: dayNumber - 1,
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
    dayNumber += 1;
  }

  return days;
}
