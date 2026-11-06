import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = () => {
    return (
        <div className="app-container">
            <Sidebar />
            <main className="main-content">
                <Header />
                <div className="page-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
