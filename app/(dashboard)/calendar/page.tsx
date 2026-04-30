"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

interface CalendarEvent {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: "High" | "Medium" | "Low";
  forecast?: string;
  previous?: string;
  actual?: string;
}

type ViewMode = "list" | "calendar";

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);

  const fetchCalendar = async () => {
    try {
      const res = await fetch("/api/calendar");
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data);
      } else {
        setError("No events found");
      }
    } catch (error) {
      setError("Failed to load calendar");
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    fetchCalendar();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const dayEvents = events.filter((e) => e.date === dateStr);
      setSelectedDayEvents(dayEvents);
    }
  }, [selectedDate, events]);



  const impactColor: Record<string, string> = {
    High: "text-red-400 bg-red-400/10 border-red-400/20",
    Medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    Low: "text-green-400 bg-green-400/10 border-green-400/20",
  };

  const impactDot: Record<string, string> = {
    High: "bg-red-400",
    Medium: "bg-yellow-400",
    Low: "bg-green-400",
  };

  const filteredEvents = events.filter((e) => {
    if (filter === "all") return true;
    return e.impact?.toLowerCase() === filter;
  });

  const groupedEvents = filteredEvents.reduce(
    (groups: Record<string, CalendarEvent[]>, event) => {
      const date = event.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
      return groups;
    },
    {}
  );

  const getEventDatesSet = () => {
    return new Set(events.map((e) => e.date));
  };

  const tileContent = ({ date }: { date: Date }) => {
    const dateStr = date.toISOString().split("T")[0];
    const dayEvents = events.filter((e) => e.date === dateStr);
    if (dayEvents.length === 0) return null;

    const hasHigh = dayEvents.some((e) => e.impact === "High");
    const hasMedium = dayEvents.some((e) => e.impact === "Medium");

    return (
      <div className="flex justify-center gap-0.5 mt-1">
        {hasHigh && <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
        {hasMedium && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
        {!hasHigh && !hasMedium && (
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Economic Calendar</h1>
          <p className="text-gray-500 text-sm mt-1">
            This week's major economic events
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              viewMode === "list"
                ? "bg-green-400 text-gray-950"
                : "text-gray-400 hover:text-white"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              viewMode === "calendar"
                ? "bg-green-400 text-gray-950"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "high", "medium", "low"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
              filter === f
                ? "bg-green-400 text-gray-950"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800"
            }`}
          >
            {f === "high" ? "🔴" : f === "medium" ? "🟡" : f === "low" ? "🟢" : ""}{" "}
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-600">
          Loading calendar...
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-400">{error}</div>
      ) : viewMode === "calendar" ? (
        // Calendar View
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar Widget */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <style>{`
              .react-calendar {
                background: transparent;
                border: none;
                font-family: inherit;
                width: 100%;
              }
              .react-calendar__navigation button {
                color: #fff;
                font-size: 14px;
                background: none;
                min-width: 40px;
              }
              .react-calendar__navigation button:hover {
                background: #1f2937;
                border-radius: 8px;
              }
              .react-calendar__navigation button:disabled {
                background: none;
              }
              .react-calendar__month-view__weekdays {
                color: #4b5563;
                font-size: 11px;
                text-transform: uppercase;
                font-weight: 600;
              }
              .react-calendar__month-view__weekdays__weekday abbr {
                text-decoration: none;
              }
              .react-calendar__tile {
                color: #9ca3af;
                font-size: 13px;
                padding: 8px 4px;
                border-radius: 8px;
                background: none;
              }
              .react-calendar__tile:hover {
                background: #1f2937;
                color: #fff;
              }
              .react-calendar__tile--active {
                background: #4ade80 !important;
                color: #111827 !important;
                font-weight: bold;
                border-radius: 8px;
              }
              .react-calendar__tile--now {
                background: #1f2937;
                color: #4ade80;
                font-weight: bold;
              }
              .react-calendar__month-view__days__day--neighboringMonth {
                color: #374151;
              }
            `}</style>
            <Calendar
              onChange={(value) => setSelectedDate(value as Date)}
              value={selectedDate}
              tileContent={tileContent}
            />

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-800">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs text-gray-500">High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-xs text-gray-500">Medium</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs text-gray-500">Low</span>
              </div>
            </div>
          </div>

          {/* Selected Day Events */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>

            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-10 text-gray-600">
                <p>No events on this day</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map((event, index) => (
                  <div
                    key={index}
                    className="border border-gray-800 rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">
                        {event.title}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          impactColor[event.impact] || ""
                        }`}
                      >
                        {event.impact}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{event.country}</span>
                      <span>{event.time}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[
                        { label: "Forecast", value: event.forecast },
                        { label: "Previous", value: event.previous },
                        { label: "Actual", value: event.actual },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className="text-gray-600 text-xs">{item.label}</p>
                          <p className={`text-xs font-mono mt-0.5 ${item.value && item.label === "Actual" ? "text-green-400" : "text-white"}`}>
                            {item.value || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // List View
        <div className="space-y-6">
          {Object.keys(groupedEvents).length === 0 ? (
            <div className="text-center py-20 text-gray-600">
              No events found
            </div>
          ) : (
            Object.entries(groupedEvents).map(([date, dayEvents]) => (
              <div key={date}>
                <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h2>
                <div className="space-y-2">
                  {dayEvents.map((event, index) => (
                    <div
                      key={index}
                      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4"
                    >
                      <div className="shrink-0 w-12 text-center">
                        <div
                          className={`w-2.5 h-2.5 rounded-full mx-auto ${
                            impactDot[event.impact] || "bg-gray-600"
                          }`}
                        />
                      </div>
                      <div className="shrink-0 w-20">
                        <p className="text-white text-xs font-mono">{event.time}</p>
                        <p className="text-gray-600 text-xs mt-0.5">{event.country}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {event.title}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border inline-block mt-1 ${
                            impactColor[event.impact] || "text-gray-400 bg-gray-800 border-gray-700"
                          }`}
                        >
                          {event.impact} Impact
                        </span>
                      </div>
                      <div className="shrink-0 grid grid-cols-3 gap-4 text-center">
                        {[
                          { label: "Forecast", value: event.forecast },
                          { label: "Previous", value: event.previous },
                          { label: "Actual", value: event.actual },
                        ].map((item) => (
                          <div key={item.label}>
                            <p className="text-gray-600 text-xs">{item.label}</p>
                            <p className={`text-xs font-mono mt-0.5 ${item.value && item.label === "Actual" ? "text-green-400" : "text-white"}`}>
                              {item.value || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}