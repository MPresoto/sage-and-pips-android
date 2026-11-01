package com.sageandpips

import android.graphics.BitmapFactory
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.math.min
import kotlin.math.roundToInt

private val Cream = Color(0xFFF7F2E8)
private val Ink = Color(0xFF283B31)
private val Muted = Color(0xFF788176)
private val SageGreen = Color(0xFF789178)
private val PaleGreen = Color(0xFFE8EEE3)
private val Terracotta = Color(0xFFC77958)
private val Card = Color(0xFFFFFCF6)

private enum class PetAction(val label: String, val icon: String, val caption: String) {
    TUMMY("Rub tummy", "♡", "A gentle tummy rub"),
    FEED("Feed", "🥣", "Sage and Pips share a tasty meal"),
    DRINK("Water", "💧", "A refreshing drink together"),
    SLEEP("Sleep", "☾", "A cozy little nap"),
    PLAY("Play", "✦", "Feather-toy fun"),
    ZOOMIES("Zoomies", "➜", "Happy paws on the move!"),
    WRESTLE("Play fight", "🐾", "A friendly tumble, then a cuddle")
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { SageAndPipsApp() }
    }
}

@Composable
private fun SageAndPipsApp() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("care", 0) }
    var hunger by remember { mutableIntStateOf(prefs.getInt("hunger", 68)) }
    var joy by remember { mutableIntStateOf(prefs.getInt("joy", 76)) }
    var energy by remember { mutableIntStateOf(prefs.getInt("energy", 82)) }
    var water by remember { mutableIntStateOf(prefs.getInt("water", 72)) }
    var action by remember { mutableStateOf(PetAction.FEED) }
    var frame by remember { mutableIntStateOf(0) }
    var note by remember { mutableStateOf("Tap an activity to see Sage and Pips spring into action.") }

    LaunchedEffect(action) {
        frame = 0
        while (true) {
            delay(if (action == PetAction.SLEEP) 420L else 210L)
            frame = (frame + 1) % 4
        }
    }

    fun save(h: Int = hunger, j: Int = joy, e: Int = energy, w: Int = water) {
        hunger = h.coerceIn(0, 100)
        joy = j.coerceIn(0, 100)
        energy = e.coerceIn(0, 100)
        water = w.coerceIn(0, 100)
        prefs.edit().putInt("hunger", hunger).putInt("joy", joy)
            .putInt("energy", energy).putInt("water", water).apply()
    }

    fun doAction(next: PetAction) {
        action = next
        when (next) {
            PetAction.TUMMY -> { save(j = joy + 14); note = "Sage purrs while Pips leans in for a cuddle." }
            PetAction.FEED -> { save(h = hunger + 24, e = energy + 3); note = "Yum! Sage and Pips are sharing their meal." }
            PetAction.DRINK -> { save(w = water + 28); note = "Lap, lap! Their water bowls are topped up." }
            PetAction.SLEEP -> { save(e = energy + 25, h = hunger - 3); note = "Two sleepy friends curl up for a peaceful nap." }
            PetAction.PLAY -> { save(j = joy + 20, e = energy - 12, h = hunger - 5, w = water - 4); note = "They take turns chasing the feather toy." }
            PetAction.ZOOMIES -> { save(j = joy + 24, e = energy - 22, h = hunger - 7, w = water - 6); note = "Zoom! The happy paws are everywhere." }
            PetAction.WRESTLE -> { save(j = joy + 16, e = energy - 12, h = hunger - 4); note = "A gentle play fight ends in a friendly cuddle." }
        }
    }

    MaterialTheme(colorScheme = lightColorScheme(background = Cream, surface = Card, primary = SageGreen, onPrimary = Color.White, onBackground = Ink, onSurface = Ink)) {
        Column(
            modifier = Modifier.fillMaxSize().background(Cream).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("YOUR LITTLE COMPANIONS", color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.6.sp)
                    Text("Sage & Pips", color = Ink, fontSize = 25.sp, fontWeight = FontWeight.Bold)
                }
                Box(Modifier.size(42.dp).clip(CircleShape).background(PaleGreen), contentAlignment = Alignment.Center) {
                    Text("☀", fontSize = 21.sp, color = SageGreen)
                }
            }
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("HOME", color = SageGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.3.sp)
                Spacer(Modifier.width(8.dp)); Box(Modifier.size(5.dp).clip(CircleShape).background(Terracotta))
                Spacer(Modifier.width(8.dp)); Text("Together since today", color = Muted, fontSize = 12.sp)
            }
            Spacer(Modifier.height(12.dp))

            Column(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(PaleGreen).padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                PixelCats(action = action, frame = frame, modifier = Modifier.fillMaxWidth().height(236.dp))
                Text(action.caption, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Ink, textAlign = TextAlign.Center)
                Text(note, modifier = Modifier.padding(top = 4.dp), fontSize = 13.sp, color = Muted, textAlign = TextAlign.Center)
            }

            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Their wellbeing", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Ink)
                Text("RIGHT NOW", fontSize = 10.sp, color = Muted, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            }
            Spacer(Modifier.height(10.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Card).padding(16.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
                CareMeter("🥣", "Tummies", hunger, Terracotta)
                CareMeter("💧", "Water", water, Color(0xFF6597A2))
                CareMeter("♡", "Good mood", joy, SageGreen)
                CareMeter("☾", "Energy", energy, Color(0xFF8E9BAA))
            }

            Spacer(Modifier.height(18.dp))
            Text("Spend a moment together", modifier = Modifier.fillMaxWidth(), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Ink)
            Text("Choose an activity to see them move.", modifier = Modifier.fillMaxWidth().padding(top = 3.dp), fontSize = 13.sp, color = Muted)
            Spacer(Modifier.height(11.dp))
            ActionRow(PetAction.TUMMY, PetAction.FEED, action, ::doAction)
            Spacer(Modifier.height(9.dp))
            ActionRow(PetAction.DRINK, PetAction.SLEEP, action, ::doAction)
            Spacer(Modifier.height(9.dp))
            ActionRow(PetAction.PLAY, PetAction.ZOOMIES, action, ::doAction)
            Spacer(Modifier.height(9.dp))
            CareAction(PetAction.WRESTLE, selected = action == PetAction.WRESTLE, modifier = Modifier.fillMaxWidth()) { doAction(PetAction.WRESTLE) }

            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color(0xFFECE5D8)).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("🐾", fontSize = 20.sp)
                Spacer(Modifier.width(10.dp))
                Column {
                    Text("Best together", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Ink)
                    Text("Sage the tabby · Pips the smoky gray cat", fontSize = 11.sp, color = Muted)
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun PixelCats(action: PetAction, frame: Int, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val resource = when (action) {
        PetAction.TUMMY -> R.drawable.pet_tummy
        PetAction.FEED -> R.drawable.pet_feed
        PetAction.DRINK -> R.drawable.pet_drink
        PetAction.SLEEP -> R.drawable.pet_sleep
        PetAction.PLAY -> R.drawable.pet_play
        PetAction.ZOOMIES -> R.drawable.pet_zoomies
        PetAction.WRESTLE -> R.drawable.pet_wrestle
    }
    val bitmap = remember(resource) { BitmapFactory.decodeResource(context.resources, resource).asImageBitmap() }
    Canvas(modifier) {
        val cellW = bitmap.width / 4
        val cellH = bitmap.height
        val ratio = cellW.toFloat() / cellH
        val destW = min(size.width, size.height * ratio)
        val destH = destW / ratio
        drawImage(
            image = bitmap,
            srcOffset = IntOffset(frame * cellW, 0),
            srcSize = IntSize(cellW, cellH),
            dstOffset = IntOffset(((size.width - destW) / 2).roundToInt(), ((size.height - destH) / 2).roundToInt()),
            dstSize = IntSize(destW.roundToInt(), destH.roundToInt()),
            filterQuality = FilterQuality.None
        )
    }
}

@Composable
private fun ActionRow(first: PetAction, second: PetAction, selected: PetAction, onAction: (PetAction) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
        CareAction(first, selected == first, Modifier.weight(1f)) { onAction(first) }
        CareAction(second, selected == second, Modifier.weight(1f)) { onAction(second) }
    }
}

@Composable
private fun CareMeter(emoji: String, label: String, value: Int, tint: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(34.dp).clip(CircleShape).background(tint.copy(alpha = 0.13f)), contentAlignment = Alignment.Center) {
            Text(emoji, fontSize = 16.sp, color = tint)
        }
        Spacer(Modifier.width(11.dp))
        Column(Modifier.weight(1f)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                Text("$value%", fontSize = 12.sp, color = Muted, fontWeight = FontWeight.Medium)
            }
            Spacer(Modifier.height(6.dp))
            LinearProgressIndicator(
                progress = { value / 100f }, modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
                color = tint, trackColor = Color(0xFFEDEAE2)
            )
        }
    }
}

@Composable
private fun CareAction(action: PetAction, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick, modifier = modifier.height(64.dp), shape = RoundedCornerShape(18.dp),
        colors = ButtonDefaults.buttonColors(containerColor = if (selected) SageGreen else Card, contentColor = if (selected) Color.White else Ink),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
    ) {
        Row(horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Text(action.icon, fontSize = 19.sp)
            Spacer(Modifier.width(7.dp))
            Text(action.label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
        }
    }
}
