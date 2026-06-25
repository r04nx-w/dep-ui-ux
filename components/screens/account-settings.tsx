'use client'

import { User } from 'lucide-react'

export function AccountSettings() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Account Summary */}
      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
        <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Account Summary</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[#007acc] rounded-full flex items-center justify-center text-white text-2xl font-bold">
            A
          </div>
          <div>
            <p className="text-lg font-semibold text-[#cccccc]">super_admin</p>
            <p className="text-sm text-[#a3a3a3]">Administrator</p>
            <p className="text-xs text-[#606060] mt-1">Last login: 2 hours ago</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#2b2b2b]">
          <div>
            <p className="text-xs text-[#a3a3a3] mb-1">Email</p>
            <p className="text-sm text-[#cccccc]">admin@company.com</p>
          </div>
          <div>
            <p className="text-xs text-[#a3a3a3] mb-1">Role</p>
            <p className="text-sm text-[#cccccc]">System Administrator</p>
          </div>
          <div>
            <p className="text-xs text-[#a3a3a3] mb-1">Department</p>
            <p className="text-sm text-[#cccccc]">Engineering</p>
          </div>
          <div>
            <p className="text-xs text-[#a3a3a3] mb-1">Joined</p>
            <p className="text-sm text-[#cccccc]">Jan 2024</p>
          </div>
        </div>
      </div>

      {/* Password Reset */}
      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
        <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">
              Current Password
            </label>
            <input
              type="password"
              className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">
              New Password
            </label>
            <input
              type="password"
              className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase">
              Confirm Password
            </label>
            <input
              type="password"
              className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:border-[#007acc]"
            />
          </div>

          <div className="bg-[#2d2d2d] rounded-sm p-3">
            <p className="text-xs text-[#a3a3a3] mb-2">Password Strength:</p>
            <div className="w-full h-2 bg-[#37373d] rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-gradient-to-r from-[#f44747] via-[#ce9178] to-[#6a9955]"></div>
            </div>
            <p className="text-xs text-[#6a9955] mt-2">Strong password</p>
          </div>

          <button className="w-full px-4 py-2 bg-[#007acc] text-white rounded-sm text-sm font-medium hover:bg-[#0e639c] transition-colors">
            Update Password
          </button>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-6">
        <h3 className="text-lg font-semibold text-[#cccccc] mb-4">API Access</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#2d2d2d] rounded-sm">
            <div>
              <p className="text-sm text-[#cccccc] font-mono">dep_api_key_***...2x4q</p>
              <p className="text-xs text-[#a3a3a3]">Created 3 months ago</p>
            </div>
            <button className="px-3 py-1 text-xs text-[#f44747] hover:bg-[#f44747] hover:text-white rounded transition-colors">
              Revoke
            </button>
          </div>
        </div>
        <button className="mt-4 px-4 py-2 bg-[#2d2d2d] text-[#569cd6] rounded-sm text-sm font-medium hover:bg-[#37373d] transition-colors">
          Generate New API Key
        </button>
      </div>
    </div>
  )
}
