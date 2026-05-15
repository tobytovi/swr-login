'use client';

/**
 * LoginForm — full v0.9 showcase (RFC §8.5).
 *
 * Demonstrates:
 *  - useLoginMethod<typeof passwordMethod> type inference → PasswordHandle
 *  - resetPasswordRequired / provideNewPassword mid-submit UI gate
 *  - useLoginMethod<typeof classCodeMethod> → ClassCodeHandle
 *  - Multi-step rendering driven by currentStep
 */

import type { AidemyUser } from '@/lib/auth/identity';
import type { classCodeMethod } from '@/lib/auth/methods/class-code';
import type { ClassCodeHandle, Student } from '@/lib/auth/methods/class-code';
import type { passwordMethod } from '@/lib/auth/methods/password';
import type { PasswordHandle } from '@/lib/auth/methods/password';
import { useState } from 'react';
import { useLoginMethod, useSession } from 'swr-login';

// ─── Password form ─────────────────────────────────────────────

function ResetPasswordDialog({
  onSubmit,
  onSkip,
}: {
  onSubmit: (pwd: string) => void;
  onSkip: () => void;
}) {
  const [newPwd, setNewPwd] = useState('');
  return (
    <div style={{ border: '1px solid #f59e0b', padding: 16, borderRadius: 8, marginTop: 16 }}>
      <p style={{ color: '#92400e', fontWeight: 600 }}>请设置新密码</p>
      <input
        type="password"
        value={newPwd}
        onChange={(e) => setNewPwd(e.target.value)}
        placeholder="新密码（至少 8 位）"
        style={{ width: '100%', padding: 8, marginBottom: 8, boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => onSubmit(newPwd)} style={{ flex: 1, padding: 8 }}>
          确认修改
        </button>
        <button
          type="button"
          onClick={() => onSkip()}
          style={{ flex: 1, padding: 8, background: '#f3f4f6' }}
        >
          跳过
        </button>
      </div>
    </div>
  );
}

function PasswordLoginTab({ variant }: { variant: 'teacher' | 'student' }) {
  // useLoginMethod infers PasswordHandle from typeof passwordMethod
  const handle = useLoginMethod<typeof passwordMethod>('aidemy/coding-password') as
    | PasswordHandle
    | undefined;
  const [account, setAccount] = useState('');
  const [pwd, setPwd] = useState('');

  if (!handle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await handle.submit({ account, password: pwd, variant });
    } catch {
      // handle.error is set by the method
    }
  };

  // Mid-submit gate: render reset-password dialog while submit is suspended
  if (handle.resetPasswordRequired) {
    return (
      <ResetPasswordDialog
        onSubmit={(p) => handle.provideNewPassword(p)}
        onSkip={() => handle.provideNewPassword(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <input
        type="text"
        placeholder="账号 / 邮箱"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 8, boxSizing: 'border-box' }}
        required
      />
      <input
        type="password"
        placeholder="密码（输入 'reset_me' 触发重置密码流程）"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 8, boxSizing: 'border-box' }}
        required
      />
      {handle.error && <p style={{ color: 'red', marginBottom: 8 }}>{handle.error.message}</p>}
      <button
        type="submit"
        disabled={handle.state === 'pending'}
        style={{ width: '100%', padding: 10 }}
      >
        {handle.state === 'pending' ? '登录中...' : '账号密码登录'}
      </button>
    </form>
  );
}

// ─── Class-code multi-step form ────────────────────────────────

function ClassCodeTab() {
  const handle = useLoginMethod<typeof classCodeMethod>('aidemy/class-code') as
    | ClassCodeHandle
    | undefined;
  const [classCode, setClassCode] = useState('');
  const [loginCode, setLoginCode] = useState('');

  if (!handle) return null;

  if (handle.currentStep === 'idle') {
    return (
      <div style={{ marginTop: 16 }}>
        <input
          type="text"
          placeholder="班级码（输入 ERROR 触发错误）"
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          style={{ width: '100%', padding: 8, marginBottom: 8, boxSizing: 'border-box' }}
        />
        <input
          type="text"
          placeholder="登录码"
          value={loginCode}
          onChange={(e) => setLoginCode(e.target.value)}
          style={{ width: '100%', padding: 8, marginBottom: 8, boxSizing: 'border-box' }}
        />
        <button
          type="button"
          onClick={() => handle.verifyCode({ classCode, loginCode })}
          style={{ width: '100%', padding: 10 }}
        >
          验证班级码
        </button>
      </div>
    );
  }

  if (handle.currentStep === 'verify') {
    return <p style={{ marginTop: 16, color: '#6b7280' }}>正在验证班级码...</p>;
  }

  if (handle.currentStep === 'select') {
    return (
      <div style={{ marginTop: 16 }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>请选择学生账号：</p>
        {handle.students.map((stu: Student) => (
          <button
            key={stu.userId}
            type="button"
            onClick={() => handle.selectStudent(stu.userId)}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              marginBottom: 6,
              textAlign: 'left',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {stu.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handle.reset()}
          style={{ marginTop: 8, padding: '6px 12px', color: '#6b7280' }}
        >
          重新输入
        </button>
      </div>
    );
  }

  if (handle.currentStep === 'token') {
    return <p style={{ marginTop: 16, color: '#6b7280' }}>正在获取 token...</p>;
  }

  return null;
}

// ─── Dashboard ─────────────────────────────────────────────────

function Dashboard() {
  const { user } = useSession<AidemyUser>();
  return (
    <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8 }}>
      <h2 style={{ color: '#166534' }}>登录成功！</h2>
      <p>
        你好，<strong>{user?.name}</strong>（{user?.role}）
      </p>
      <p style={{ color: '#6b7280', fontSize: 14 }}>ID: {user?.id}</p>
    </div>
  );
}

// ─── Root LoginForm ────────────────────────────────────────────

export default function LoginForm({ variant = 'student' }: { variant?: 'teacher' | 'student' }) {
  const { status } = useSession<AidemyUser>();
  const [tab, setTab] = useState<'password' | 'class-code'>('password');

  if (status === 'loading') {
    return <p style={{ color: '#9ca3af' }}>检查登录状态...</p>;
  }

  if (status === 'authenticated') {
    return <Dashboard />;
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 4 }}>swr-login v0.9 · Aidemy Demo</h1>
      <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
        RFC §8 多步骤 Method Showcase
      </p>

      {/* Tab selector */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
        }}
      >
        {(['password', 'class-code'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '10px 0',
              background: tab === t ? '#3b82f6' : '#f9fafb',
              color: tab === t ? '#fff' : '#374151',
              border: 'none',
              cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
              fontSize: 14,
            }}
          >
            {t === 'password' ? '账号密码' : '班级码登录'}
          </button>
        ))}
      </div>

      {tab === 'password' ? <PasswordLoginTab variant={variant} /> : <ClassCodeTab />}
    </div>
  );
}
