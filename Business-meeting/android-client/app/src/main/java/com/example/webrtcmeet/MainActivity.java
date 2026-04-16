package com.example.webrtcmeet;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;

/**
 * Join screen — enter server IP, room ID, and user name.
 * Handles runtime permission requests for camera and microphone.
 */
public class MainActivity extends AppCompatActivity {
    private static final int PERMISSION_REQUEST_CODE = 100;
    private static final String[] REQUIRED_PERMISSIONS = {
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
    };

    private TextInputEditText etServerIp, etRoomId, etUserName;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        etServerIp = findViewById(R.id.etServerIp);
        etRoomId   = findViewById(R.id.etRoomId);
        etUserName = findViewById(R.id.etUserName);
        MaterialButton btnJoin = findViewById(R.id.btnJoin);

        btnJoin.setOnClickListener(v -> attemptJoin());
    }

    private void attemptJoin() {
        String serverIp = getText(etServerIp);
        String roomId   = getText(etRoomId);
        String userName  = getText(etUserName);

        if (serverIp.isEmpty() || roomId.isEmpty() || userName.isEmpty()) {
            Toast.makeText(this, R.string.error_empty_fields, Toast.LENGTH_SHORT).show();
            return;
        }

        if (hasPermissions()) {
            startCall(serverIp, roomId, userName);
        } else {
            ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, PERMISSION_REQUEST_CODE);
        }
    }

    private boolean hasPermissions() {
        for (String perm : REQUIRED_PERMISSIONS) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allGranted = true;
            for (int r : grantResults) {
                if (r != PackageManager.PERMISSION_GRANTED) { allGranted = false; break; }
            }
            if (allGranted) {
                startCall(getText(etServerIp), getText(etRoomId), getText(etUserName));
            } else {
                Toast.makeText(this, R.string.error_permission, Toast.LENGTH_LONG).show();
            }
        }
    }

    private void startCall(String serverIp, String roomId, String userName) {
        Intent intent = new Intent(this, CallActivity.class);
        intent.putExtra("serverIp", serverIp);
        intent.putExtra("roomId", roomId);
        intent.putExtra("userName", userName);
        startActivity(intent);
    }

    private String getText(TextInputEditText et) {
        return et.getText() != null ? et.getText().toString().trim() : "";
    }
}
