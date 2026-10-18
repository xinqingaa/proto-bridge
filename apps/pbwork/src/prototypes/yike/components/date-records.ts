import { heatmapWeeks, parseDay, shiftDay } from "@/design-system/components/_shared/calendar";
export type HabitDayState = "done" | "off" | "missing" | "before" | "future" | "archived";
export const habitDayLabels: Record<HabitDayState, string> = {done:"已完成",off:"未打卡",missing:"数据缺失",before:"创建前",future:"未来日期",archived:"归档期间"};
export function habitYearWeeks(input: {
  today: string; createdOn: string;
  days: Array<{date:string; completed:boolean | null}>;
  completeness?: "complete" | "partial";
  archived?: Array<{from:string;to?:string}>;
}) {
  if(!parseDay(input.today)||!parseDay(input.createdOn)) return [];
  const first=shiftDay(input.today,-364)!;
  const values=new Map(input.days.filter(day=>parseDay(day.date)).map(day=>[day.date,day.completed]));
  const range=Array.from({length:365},(_,index)=>({date:shiftDay(first,index)!,value:0}));
  return heatmapWeeks(range).map(week=>week.map(day=>{
    let state:HabitDayState;
    if(day.date>input.today) state="future";
    else if(day.date<input.createdOn || day.date<first) state="before";
    else if(values.get(day.date) === true) state="done";
    else if(input.archived?.some(period=>parseDay(period.from) && (!period.to||parseDay(period.to)) && day.date>=period.from && (!period.to||day.date<=period.to))) state="archived";
    else if(values.get(day.date) === null || (input.completeness === "partial" && !values.has(day.date))) state="missing";
    else state="off";
    return {date:day.date,state};
  }));
}
