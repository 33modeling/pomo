import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ClockMode } from './components/ClockMode'
import { Layout } from './components/Layout'
import { resyncReminders } from './db/repo'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import { TasksPage } from './pages/TasksPage'
import { TimerPage } from './pages/TimerPage'
import { useTimerStore } from './store/timerStore'

export default function App() {
  useEffect(() => {
    useTimerStore.getState().init()
    void resyncReminders()
  }, [])

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TimerPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<TimerPage />} />
        </Route>
      </Routes>
      <ClockMode />
    </>
  )
}
