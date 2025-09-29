const MyStudentDashboard = () => {
  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 px-8 py-6" style={{ fontFamily: 'Sora, sans-serif' }}>
        <header className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-4xl font-bold">My Student Dashboard</h1>
            </div>
            <div className="h-16 w-16  rounded-full flex items-center justify-center p-2">
               <img src="https://api.dicebear.com/9.x/adventurer/svg?seed=O" className="w-full h-full contain " alt="avatar" />

            </div>
        </header>
        <div className="flex flex-col gap-6">
            <div>
            <h1 className="text-3xl font-bold mb-4">Available Cohorts</h1>
                <div className="grid grid-cols-4 gap-4">

                    <div className="h-[180px] w-[320px] rounded-sm overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                        <img src="https://bitshala.org/cohort/mb.webp" alt="" className="w-full h-full object-contain" />
                    </div>

                    <div className="h-[180px] w-[320px] rounded-sm overflow-hidden relative cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                        <img src="https://bitshala.org/cohort/lbtcl.webp" alt="" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">Join the waitlist</span>
                        </div>
                    </div>
                    <div className="h-[180px] w-[320px] rounded-sm overflow-hidden relative cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                        <img src="https://bitshala.org/cohort/bpd.webp" alt="" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">Join the waitlist</span>
                        </div>
                    </div>
                    <div className="h-[180px] w-[320px] rounded-sm overflow-hidden relative cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                        <img src="https://bitshala.org/cohort/pb.webp" alt="" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">Join the waitlist</span>
                        </div>
                    </div>
                </div>
            </div>
              <div>
                             <h1 className="text-3xl font-bold mb-4">My Active Cohorts</h1>
            <div className="grid grid-cols-4 gap-4">       
                    <div className="h-[180px] w-[320px] rounded-sm overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                        <img src="https://bitshala.org/cohort/mb.webp" alt="" className="w-full h-full object-containr" />
                    </div>

            
                </div>
            </div>
        </div>
    </div>
  );
};

export default MyStudentDashboard;