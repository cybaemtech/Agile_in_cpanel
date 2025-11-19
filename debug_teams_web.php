<!DOCTYPE html>
<html>
<head>
    <title>Teams API Debug</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #f0f0f0; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        .debug-section { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px solid #ddd; }
        pre { background: #f8f8f8; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Teams API Debug Tool</h1>
    
    <?php
    session_start();
    
    echo "<div class='debug-section'>";
    echo "<h2>Environment Info</h2>";
    echo "<div class='info'>Server: " . ($_SERVER['SERVER_NAME'] ?? 'Unknown') . "</div>";
    echo "<div class='info'>Request URI: " . ($_SERVER['REQUEST_URI'] ?? 'Unknown') . "</div>";
    echo "<div class='info'>PHP Version: " . PHP_VERSION . "</div>";
    echo "<div class='info'>Session ID: " . session_id() . "</div>";
    echo "<div class='info'>User ID in session: " . ($_SESSION['user_id'] ?? 'NOT SET') . "</div>";
    echo "</div>";
    
    // Test database connection
    echo "<div class='debug-section'>";
    echo "<h2>Database Connection Test</h2>";
    
    require_once 'api/config/database.php';
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        echo "<div class='error'>❌ Database connection failed</div>";
        echo "<div>Check your database configuration in api/config/database.php</div>";
    } else {
        echo "<div class='success'>✅ Database connection successful</div>";
        
        // Check current user if logged in
        if (isset($_SESSION['user_id'])) {
            try {
                $stmt = $conn->prepare("SELECT id, username, full_name, user_role FROM users WHERE id = ?");
                $stmt->execute([$_SESSION['user_id']]);
                $user = $stmt->fetch();
                
                if ($user) {
                    echo "<div class='success'>✅ Current user: {$user['full_name']} ({$user['username']}) - Role: {$user['user_role']}</div>";
                } else {
                    echo "<div class='error'>❌ User not found in database</div>";
                }
            } catch (Exception $e) {
                echo "<div class='error'>❌ Error checking user: " . $e->getMessage() . "</div>";
            }
        } else {
            echo "<div class='error'>⚠️ No user logged in</div>";
        }
        
        // List teams and their members
        try {
            echo "<h3>Teams and Members</h3>";
            $stmt = $conn->prepare("SELECT id, name FROM teams ORDER BY name LIMIT 10");
            $stmt->execute();
            $teams = $stmt->fetchAll();
            
            foreach ($teams as $team) {
                echo "<div><strong>Team {$team['id']}: {$team['name']}</strong></div>";
                
                $stmt2 = $conn->prepare("
                    SELECT tm.id as member_id, tm.user_id, u.full_name, u.email, tm.role 
                    FROM team_members tm 
                    JOIN users u ON tm.user_id = u.id 
                    WHERE tm.team_id = ?
                    ORDER BY u.full_name
                ");
                $stmt2->execute([$team['id']]);
                $members = $stmt2->fetchAll();
                
                if ($members) {
                    echo "<ul>";
                    foreach ($members as $member) {
                        echo "<li>User {$member['user_id']}: {$member['full_name']} ({$member['email']}) - {$member['role']}</li>";
                    }
                    echo "</ul>";
                } else {
                    echo "<div>No members in this team</div>";
                }
                echo "<br>";
            }
        } catch (Exception $e) {
            echo "<div class='error'>❌ Error listing teams: " . $e->getMessage() . "</div>";
        }
    }
    echo "</div>";
    
    // Test API endpoints if we have a team to test with
    if ($conn && !empty($teams)) {
        echo "<div class='debug-section'>";
        echo "<h2>API Endpoint Tests</h2>";
        
        $testTeamId = $teams[0]['id'];
        echo "<div>Testing with Team ID: $testTeamId</div>";
        
        // Test GET team members
        echo "<h3>GET /teams/$testTeamId/members</h3>";
        $url = "/api/teams/$testTeamId/members";
        echo "<div>Would call: GET $url</div>";
        
        // Test DELETE member (simulation only)
        if (!empty($members)) {
            $testUserId = $members[0]['user_id'];
            $testUserName = $members[0]['full_name'];
            echo "<h3>DELETE /teams/$testTeamId/members/$testUserId (simulation)</h3>";
            $url = "/api/teams/$testTeamId/members/$testUserId";
            echo "<div>Would call: DELETE $url</div>";
            echo "<div>Target user: $testUserName</div>";
        }
        
        echo "</div>";
    }
    
    // JavaScript test section
    ?>
    
    <div class='debug-section'>
        <h2>Live API Test</h2>
        <div id="test-results"></div>
        <button onclick="testTeamsAPI()">Test Teams API</button>
    </div>
    
    <script>
    async function testTeamsAPI() {
        const resultsDiv = document.getElementById('test-results');
        resultsDiv.innerHTML = '<div>Testing...</div>';
        
        try {
            // Test GET teams
            console.log('Testing GET /api/teams');
            const teamsResponse = await fetch('/api/teams', {
                method: 'GET',
                credentials: 'include'
            });
            
            resultsDiv.innerHTML += `<div>GET /api/teams: ${teamsResponse.status} ${teamsResponse.statusText}</div>`;
            
            if (teamsResponse.ok) {
                const teams = await teamsResponse.json();
                resultsDiv.innerHTML += `<div>✅ Found ${teams.length} teams</div>`;
                console.log('Teams:', teams);
                
                // Test with first team if available
                if (teams.length > 0) {
                    const testTeam = teams[0];
                    resultsDiv.innerHTML += `<div>Testing with team: ${testTeam.name} (ID: ${testTeam.id})</div>`;
                    
                    // Test GET team members
                    const membersResponse = await fetch(`/api/teams/${testTeam.id}/members`, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    
                    resultsDiv.innerHTML += `<div>GET /api/teams/${testTeam.id}/members: ${membersResponse.status} ${membersResponse.statusText}</div>`;
                    
                    if (membersResponse.ok) {
                        const members = await membersResponse.json();
                        resultsDiv.innerHTML += `<div>✅ Found ${members.length} members</div>`;
                        console.log('Members:', members);
                    } else {
                        const error = await membersResponse.text();
                        resultsDiv.innerHTML += `<div>❌ Error: ${error}</div>`;
                    }
                }
            } else {
                const error = await teamsResponse.text();
                resultsDiv.innerHTML += `<div>❌ Error: ${error}</div>`;
            }
        } catch (error) {
            resultsDiv.innerHTML += `<div>❌ Network error: ${error.message}</div>`;
            console.error('Test error:', error);
        }
    }
    </script>
</body>
</html>