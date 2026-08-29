import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { healthCheck } from './api/client.js'
import Navbar from './components/Navbar.jsx'
import Home from './components/Home.jsx'
import CreateIntentPage from './components/CreateIntentPage.jsx'
import MatchesPage from './components/MatchesPage.jsx'
import CircleBuilder from './components/CircleBuilder.jsx'
import InvitationPage from './components/InvitationPage.jsx'
import CircleWorkspace from './components/CircleWorkspace.jsx'
import CirclesIndex from './components/CirclesIndex.jsx'
import DiscoverPage from './components/DiscoverPage.jsx'
import OrganisationsPage from './components/OrganisationsPage.jsx'
import OrganisationDetail from './components/OrganisationDetail.jsx'
import FoundersPage from './components/FoundersPage.jsx'
import PlaceholderPage from './components/PlaceholderPage.jsx'
import './App.css'

function App() {
  useEffect(() => {
    if (import.meta.env.DEV) healthCheck().catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateIntentPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/builder" element={<CircleBuilder />} />
            <Route path="/invite" element={<InvitationPage />} />
            <Route path="/circles/:id" element={<CircleWorkspace />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/circles" element={<CirclesIndex />} />
            <Route path="/organisations" element={<OrganisationsPage />} />
            <Route path="/organisations/:id" element={<OrganisationDetail />} />
            <Route path="/founders" element={<FoundersPage />} />
            <Route path="*" element={<PlaceholderPage eyebrow="404" title="That page hasn’t converged yet" description="Head home to start with what you want to make happen." />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
