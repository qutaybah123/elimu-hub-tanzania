import React, { useState } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Container,
  Divider, Grid, TextField, Typography,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ fullName: user?.fullName || '', grade: user?.grade || '', schoolId: user?.schoolId || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwError, setPwError] = useState('');

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/users/me', form);
      updateUser({ fullName: res.data.data.full_name, grade: res.data.data.grade, schoolId: res.data.data.school_id });
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    setChangingPw(true);
    try {
      await api.put('/users/me/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully!');
    } catch (err) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>My Profile</Typography>

      <Grid container spacing={3}>
        {/* Profile Info */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: 32 }}>
                {user?.fullName?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="h6" fontWeight={700}>{user?.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, textTransform: 'capitalize',
                bgcolor: 'primary.light', color: 'white', borderRadius: 10, px: 2, py: 0.5, display: 'inline-block', mt: 1 }}>
                {user?.role}
              </Typography>
              {user?.grade && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Grade: {user.grade}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Edit Profile */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Edit Profile</Typography>
              <TextField fullWidth label="Full Name" value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} margin="normal" />
              <TextField fullWidth label="Grade / Form" value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })} margin="normal" />
              <TextField fullWidth label="School ID" value={form.schoolId}
                onChange={(e) => setForm({ ...form, schoolId: e.target.value })} margin="normal" />
              <TextField fullWidth label="Email" value={user?.email} disabled margin="normal" helperText="Email cannot be changed" />
              <Button variant="contained" sx={{ mt: 2 }} onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Change Password</Typography>
              {pwError && <Alert severity="error" sx={{ mb: 2 }}>{pwError}</Alert>}
              <TextField fullWidth label="Current Password" type="password" value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} margin="normal" />
              <TextField fullWidth label="New Password" type="password" value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} margin="normal" />
              <TextField fullWidth label="Confirm New Password" type="password" value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} margin="normal" />
              <Button variant="outlined" sx={{ mt: 2 }} onClick={handleChangePassword} disabled={changingPw}>
                {changingPw ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProfilePage;
