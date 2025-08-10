import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const StaffProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-semibold text-gray-900">
                            Owu Palace HRMS - Staff Profile
                        </h1>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/staff')}
                                className="bg-gray-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-600"
                            >
                                Back to Staff List
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="bg-sky-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-sky-600"
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={logout}
                                className="bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Staff Profile</h2>
                    <p className="text-gray-600">Staff ID: {id}</p>
                    <p className="text-sm text-gray-500 mt-4">
                        This is a placeholder for the staff profile page. The full implementation will show detailed staff information,
                        salary details, loan information, and allow admin queries.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default StaffProfile;
export { };