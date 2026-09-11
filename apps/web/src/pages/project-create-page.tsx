import { Link, useNavigate } from 'react-router-dom';
import { CreateProjectForm } from '../create-project-form.js';

export function ProjectCreatePage() {
  const navigate = useNavigate();
  return <><header className="page-header"><div><Link to="/projects" className="back-link">← Projects</Link><p className="eyebrow">Project registry</p><h1>Add project</h1><p>Register a project and its approved repository before assigning delivery work.</p></div></header><CreateProjectForm onCreated={() => { void navigate('/projects'); }} /></>;
}
